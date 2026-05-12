@file:OptIn(ExperimentalMaterial3Api::class)
package com.protrack.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import java.text.SimpleDateFormat
import java.util.*

fun getPriorityOrder(delivered: Boolean, reviewWritten: Boolean, paymentReceived: Boolean): Int {
    return when {
        !delivered -> 0                                        // A - highest priority (red)
        delivered && !reviewWritten -> 1                      // B (orange)
        delivered && reviewWritten && !paymentReceived -> 2   // C (yellow)
        else -> 3                                             // Done (green)
    }
}

fun getPriorityColor(delivered: Boolean, reviewWritten: Boolean, paymentReceived: Boolean): Color {
    return when (getPriorityOrder(delivered, reviewWritten, paymentReceived)) {
        0 -> Color(0xFFFF4444)
        1 -> Color(0xFFFF8800)
        2 -> Color(0xFFFFD700)
        else -> Color(0xFF4CAF50)
    }
}

fun getPriorityLabel(delivered: Boolean, reviewWritten: Boolean, paymentReceived: Boolean): String {
    return when (getPriorityOrder(delivered, reviewWritten, paymentReceived)) {
        0 -> "Undelivered"
        1 -> "Review Pending"
        2 -> "Payment Pending"
        else -> "Done"
    }
}

fun formatTimestamp(ts: Timestamp?): String {
    if (ts == null || ts.seconds == 0L) return ""
    val sdf = SimpleDateFormat("MMM d hh:mm a", Locale.getDefault())
    return sdf.format(ts.toDate())
}

data class Order(
    val id: String = "",
    val productName: String = "",
    val sellerName: String = "",
    val marketplace: String = "",
    val orderNumber: String = "",
    val price: Double = 0.0,
    val commissionAmount: Double = 0.0,
    val amountCredited: Double = 0.0,
    val paypalAccount: String = "Shanu PP",
    val reviewType: String = "text",
    val delivered: Boolean = false,
    val reviewWritten: Boolean = false,
    val paymentReceived: Boolean = false,
    val deliveredAt: Timestamp? = null,
    val reviewWrittenAt: Timestamp? = null,
    val paymentReceivedAt: Timestamp? = null
)

@Composable
fun DashboardScreen(
    onAddOrder: () -> Unit,
    onEditOrder: (String) -> Unit,
    onLogout: () -> Unit
) {
    val db = FirebaseFirestore.getInstance()
    val auth = FirebaseAuth.getInstance()
    var orders by remember { mutableStateOf(listOf<Order>()) }
    var amtCrInputs by remember { mutableStateOf(mapOf<String, String>()) }

    DisposableEffect(Unit) {
        val listener = db.collection("orders")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snap, _ ->
                snap?.let {
                    val raw = it.documents.map { doc ->
                        Order(
                            id = doc.id,
                            productName = doc.getString("productName") ?: "",
                            sellerName = doc.getString("sellerName") ?: "",
                            marketplace = doc.getString("marketplace") ?: "",
                            orderNumber = doc.getString("orderNumber") ?: "",
                            price = doc.getDouble("price") ?: 0.0,
                            commissionAmount = doc.getDouble("commissionAmount") ?: 0.0,
                            amountCredited = doc.getDouble("amountCredited") ?: 0.0,
                            paypalAccount = doc.getString("paypalAccount") ?: "Shanu PP",
                            reviewType = doc.getString("reviewType") ?: "text",
                            delivered = doc.getBoolean("delivered") ?: false,
                            reviewWritten = doc.getBoolean("reviewWritten") ?: false,
                            paymentReceived = doc.getBoolean("paymentReceived") ?: false,
                            deliveredAt = doc.getTimestamp("deliveredAt"),
                            reviewWrittenAt = doc.getTimestamp("reviewWrittenAt"),
                            paymentReceivedAt = doc.getTimestamp("paymentReceivedAt")
                        )
                    }
                    // Sort by priority: A (undelivered) first → B → C → Done last
                    orders = raw.sortedBy { o ->
                        getPriorityOrder(o.delivered, o.reviewWritten, o.paymentReceived)
                    }
                }
            }
        onDispose { listener.remove() }
    }

    val totalSum = orders.sumOf { it.price + it.commissionAmount }
    val commSum = orders.sumOf { it.commissionAmount }
    val amtCrSum = orders.sumOf { it.amountCredited }
    val receivedSum = orders.filter { it.paymentReceived }.sumOf { it.amountCredited }
    val pendingSum = orders.filter { !it.paymentReceived }.sumOf { it.price + it.commissionAmount }

    Box(modifier = Modifier.fillMaxSize().background(DarkBg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp).padding(top = 32.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("ProTrack", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                TextButton(onClick = { auth.signOut(); onLogout() }) {
                    Text("Logout", color = Color.Gray)
                }
            }

            // Summary row 1
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SummaryBox("Total", "${"$"}${"%.2f".format(totalSum)}", AccentBlue, Modifier.weight(1f))
                SummaryBox("Amt Cr", "${"$"}${"%.2f".format(amtCrSum)}", Color(0xFF00BCD4), Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(6.dp))

            // Summary row 2
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SummaryBox("Comm", "${"$"}${"%.2f".format(commSum)}", Color(0xFFFF8800), Modifier.weight(1f))
                SummaryBox("Received", "${"$"}${"%.2f".format(receivedSum)}", Color(0xFF4CAF50), Modifier.weight(1f))
                SummaryBox("Pending", "${"$"}${"%.2f".format(pendingSum)}", Color(0xFFFF4444), Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp)) {
                items(orders) { order ->
                    OrderCard(
                        order = order,
                        amtCrInput = amtCrInputs[order.id] ?: order.amountCredited.toString(),
                        onAmtCrChange = { amtCrInputs = amtCrInputs + (order.id to it) },
                        onAmtCrSave = { value ->
                            db.collection("orders").document(order.id).update("amountCredited", value)
                        },
                        onToggle = { field, current ->
                            val updates = mutableMapOf<String, Any>(field to !current)
                            val tsField = when (field) {
                                "delivered" -> "deliveredAt"
                                "reviewWritten" -> "reviewWrittenAt"
                                "paymentReceived" -> "paymentReceivedAt"
                                else -> null
                            }
                            if (tsField != null) {
                                updates[tsField] = if (!current) Timestamp.now() else Timestamp(0, 0)
                            }
                            db.collection("orders").document(order.id).update(updates)
                        },
                        onEdit = { onEditOrder(order.id) },
                        onDelete = { db.collection("orders").document(order.id).delete() }
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }

        FloatingActionButton(
            onClick = onAddOrder,
            modifier = Modifier.align(Alignment.BottomEnd).padding(24.dp),
            containerColor = AccentBlue,
            shape = CircleShape
        ) {
            Icon(Icons.Default.Add, contentDescription = "Add", tint = Color.White)
        }
    }
}

@Composable
fun SummaryBox(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontSize = 11.sp, color = Color.Gray)
            Text(value, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
fun OrderCard(
    order: Order,
    amtCrInput: String,
    onAmtCrChange: (String) -> Unit,
    onAmtCrSave: (Double) -> Unit,
    onToggle: (String, Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val total = order.price + order.commissionAmount
    val priorityColor = getPriorityColor(order.delivered, order.reviewWritten, order.paymentReceived)
    val priorityLabel = getPriorityLabel(order.delivered, order.reviewWritten, order.paymentReceived)
    val amtCrValue = amtCrInput.toDoubleOrNull() ?: 0.0
    val amtCrColor = when {
        amtCrValue <= 0 -> Color.Gray
        amtCrValue >= total -> Color(0xFF4CAF50)
        else -> Color(0xFFFF4444)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        shape = RoundedCornerShape(8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .background(priorityColor, RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp))
        )
        Column(modifier = Modifier.padding(12.dp)) {
            // Product name + amounts
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(order.productName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("${order.marketplace} · ${order.sellerName}", color = Color.Gray, fontSize = 12.sp)
                    Text(order.paypalAccount, color = Color.Gray, fontSize = 11.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("${"$"}${"%.2f".format(total)}", color = priorityColor, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Text("Cr: ${"$"}${"%.2f".format(amtCrValue)}", color = amtCrColor, fontSize = 13.sp)
                    Text(priorityLabel, color = priorityColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(modifier = Modifier.height(6.dp))

            // Amt Cr input
            OutlinedTextField(
                value = amtCrInput,
                onValueChange = onAmtCrChange,
                label = { Text("Amt Cr", color = Color.Gray) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Spacer(modifier = Modifier.height(8.dp))

            // Checkboxes with full labels and timestamps below each
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                CheckItemWithTimestamp(
                    label = "Delivery",
                    checked = order.delivered,
                    timestamp = formatTimestamp(order.deliveredAt),
                    onToggle = { onToggle("delivered", order.delivered) }
                )
                CheckItemWithTimestamp(
                    label = "Receive",
                    checked = order.reviewWritten,
                    timestamp = formatTimestamp(order.reviewWrittenAt),
                    onToggle = { onToggle("reviewWritten", order.reviewWritten) }
                )
                CheckItemWithTimestamp(
                    label = "Pay",
                    checked = order.paymentReceived,
                    timestamp = formatTimestamp(order.paymentReceivedAt),
                    onToggle = { onToggle("paymentReceived", order.paymentReceived) }
                )
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onEdit) { Text("Edit", color = AccentBlue) }
                TextButton(onClick = onDelete) { Text("Delete", color = Color(0xFFFF4444)) }
                TextButton(onClick = { onAmtCrSave(amtCrInput.toDoubleOrNull() ?: 0.0) }) {
                    Text("Save Cr", color = Color(0xFF00BCD4))
                }
            }
        }
    }
}

@Composable
fun CheckItemWithTimestamp(label: String, checked: Boolean, timestamp: String, onToggle: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(
                checked = checked,
                onCheckedChange = { onToggle() },
                colors = CheckboxDefaults.colors(checkedColor = Color(0xFF4CAF50))
            )
            Text(label, color = Color.Gray, fontSize = 12.sp)
        }
        if (timestamp.isNotEmpty()) {
            Text(timestamp, color = Color(0xFF888888), fontSize = 10.sp)
        }
    }
}

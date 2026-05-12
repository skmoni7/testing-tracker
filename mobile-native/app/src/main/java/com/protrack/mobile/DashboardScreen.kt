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
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query

fun getPriorityColor(delivered: Boolean, reviewWritten: Boolean, paymentReceived: Boolean): Color {
    return when {
        !delivered && !reviewWritten && !paymentReceived -> Color(0xFFFF4444)
        delivered && !reviewWritten && !paymentReceived -> Color(0xFFFF8800)
        delivered && reviewWritten && !paymentReceived -> Color(0xFFFFD700)
        else -> Color(0xFF4CAF50)
    }
}

data class Order(
    val id: String = "",
    val productName: String = "",
    val sellerName: String = "",
    val marketplace: String = "",
    val orderNumber: String = "",
    val productAmount: Double = 0.0,
    val commissionAmount: Double = 0.0,
    val amtCr: Double = 0.0,
    val delivered: Boolean = false,
    val reviewWritten: Boolean = false,
    val paymentReceived: Boolean = false
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
                    orders = it.documents.map { doc ->
                        Order(
                            id = doc.id,
                            productName = doc.getString("productName") ?: "",
                            sellerName = doc.getString("sellerName") ?: "",
                            marketplace = doc.getString("marketplace") ?: "",
                            orderNumber = doc.getString("orderNumber") ?: "",
                            productAmount = doc.getDouble("productAmount") ?: 0.0,
                            commissionAmount = doc.getDouble("commissionAmount") ?: 0.0,
                            amtCr = doc.getDouble("amtCr") ?: 0.0,
                            delivered = doc.getBoolean("delivered") ?: false,
                            reviewWritten = doc.getBoolean("reviewWritten") ?: false,
                            paymentReceived = doc.getBoolean("paymentReceived") ?: false
                        )
                    }
                }
            }
        onDispose { listener.remove() }
    }

    val totalSum = orders.sumOf { it.productAmount + it.commissionAmount }
    val amtCrSum = orders.sumOf { it.amtCr }

    Box(modifier = Modifier.fillMaxSize().background(DarkBg)) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp).padding(top = 32.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("ProTrack", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                TextButton(onClick = onLogout) { Text("Logout", color = Color.Gray) }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                SummaryBox("Total", "$${"%.2f".format(totalSum)}", AccentBlue, Modifier.weight(1f))
                SummaryBox("Amt Cr", "$${"%.2f".format(amtCrSum)}", Color(0xFF00BCD4), Modifier.weight(1f))
            }
            Spacer(modifier = Modifier.height(8.dp))

            LazyColumn(modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp)) {
                items(orders) { order ->
                    OrderCard(
                        order = order,
                        amtCrInput = amtCrInputs[order.id] ?: order.amtCr.toString(),
                        onAmtCrChange = { amtCrInputs = amtCrInputs + (order.id to it) },
                        onAmtCrSave = { value ->
                            db.collection("orders").document(order.id).update("amtCr", value)
                        },
                        onToggle = { field, current ->
                            db.collection("orders").document(order.id).update(field, !current)
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
    val total = order.productAmount + order.commissionAmount
    val priorityColor = getPriorityColor(order.delivered, order.reviewWritten, order.paymentReceived)
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
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(order.productName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Text("${order.marketplace} - ${order.sellerName}", color = Color.Gray, fontSize = 12.sp)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("$${"%.2f".format(total)}", color = priorityColor, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    OutlinedTextField(
                        value = amtCrInput,
                        onValueChange = onAmtCrChange,
                        label = { Text("Amt Cr", fontSize = 9.sp) },
                        modifier = Modifier.width(90.dp).height(56.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = amtCrColor,
                            unfocusedTextColor = amtCrColor,
                            focusedBorderColor = amtCrColor,
                            unfocusedBorderColor = amtCrColor
                        ),
                        singleLine = true
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                CheckItem("Del", order.delivered) { onToggle("delivered", order.delivered) }
                CheckItem("Rev", order.reviewWritten) { onToggle("reviewWritten", order.reviewWritten) }
                CheckItem("Pay", order.paymentReceived) { onToggle("paymentReceived", order.paymentReceived) }
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
fun CheckItem(label: String, checked: Boolean, onToggle: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Checkbox(
            checked = checked,
            onCheckedChange = { onToggle() },
            colors = CheckboxDefaults.colors(checkedColor = Color(0xFF4CAF50))
        )
        Text(label, color = Color.Gray, fontSize = 12.sp)
    }
}

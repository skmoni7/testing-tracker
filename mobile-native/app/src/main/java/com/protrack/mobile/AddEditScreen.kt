@file:OptIn(ExperimentalMaterial3Api::class)
package com.protrack.mobile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.protrack.mobile.ui.theme.AccentBlue

val MARKETPLACES    = listOf("Amazon", "Walmart", "Temu", "Shein", "Other")
val PAYPAL_ACCOUNTS = listOf("Shanu PP", "Jisa PP")
val REVIEW_TYPES    = listOf("text", "text+pic")

@Composable
fun AddEditScreen(orderId: String, onSaved: () -> Unit, onCancel: () -> Unit) {
    val db   = FirebaseFirestore.getInstance()
    val auth = FirebaseAuth.getInstance()
    val isNew = orderId == "new"

    // ── Form state ────────────────────────────────────────────────────────────
    var productName      by remember { mutableStateOf("") }
    var orderNumber      by remember { mutableStateOf("") }
    var marketplace      by remember { mutableStateOf("Amazon") }
    var sellerName       by remember { mutableStateOf("") }
    var price            by remember { mutableStateOf("") }
    var commissionAmount by remember { mutableStateOf("0") }
    var paypalAccount    by remember { mutableStateOf("Shanu PP") }
    var reviewType       by remember { mutableStateOf("text") }
    var loading          by remember { mutableStateOf(false) }
    var errorMsg         by remember { mutableStateOf("") }

    // ── Load existing order when editing ────────────────────────────────────
    LaunchedEffect(orderId) {
        if (!isNew) {
            db.collection("orders").document(orderId).get()
                .addOnSuccessListener { doc ->
                    productName      = doc.getString("productName")      ?: ""
                    orderNumber      = doc.getString("orderNumber")      ?: ""
                    marketplace      = doc.getString("marketplace")      ?: "Amazon"
                    sellerName       = doc.getString("sellerName")       ?: ""
                    price            = (doc.getDouble("price")           ?: 0.0).toString()
                    commissionAmount = (doc.getDouble("commissionAmount") ?: 0.0).toString()
                    paypalAccount    = doc.getString("paypalAccount")    ?: "Shanu PP"
                    reviewType       = doc.getString("reviewType")       ?: "text"
                }
        }
    }

    // ── Theme-aware colors from MaterialTheme ────────────────────────────────
    val bgColor          = MaterialTheme.colorScheme.background
    val textColor        = MaterialTheme.colorScheme.onBackground
    val mutedColor       = MaterialTheme.colorScheme.onSurfaceVariant
    val fieldBg          = MaterialTheme.colorScheme.surfaceVariant
    val fieldText        = MaterialTheme.colorScheme.onSurface
    val outlineColor     = MaterialTheme.colorScheme.outline

    // ── Shared OutlinedTextField colors (fixes invisible typed text) ─────────
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor      = fieldText,
        unfocusedTextColor    = fieldText,
        focusedContainerColor = fieldBg,
        unfocusedContainerColor = fieldBg,
        focusedBorderColor    = AccentBlue,
        unfocusedBorderColor  = outlineColor,
        focusedLabelColor     = AccentBlue,
        unfocusedLabelColor   = mutedColor,
        cursorColor           = AccentBlue,
    )

    // ── UI ────────────────────────────────────────────────────────────────────
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        // Title
        Text(
            if (isNew) "Add Order" else "Edit Order",
            fontSize    = 24.sp,
            fontWeight  = FontWeight.Bold,
            color       = textColor
        )
        Spacer(Modifier.height(24.dp))

        // Product Name
        FormLabel("Product Name *", mutedColor)
        OutlinedTextField(
            value         = productName,
            onValueChange = { productName = it },
            modifier      = Modifier.fillMaxWidth(),
            placeholder   = { Text("Product name", color = mutedColor) },
            colors        = fieldColors
        )
        Spacer(Modifier.height(12.dp))

        // Order Number
        FormLabel("Order Number", mutedColor)
        OutlinedTextField(
            value         = orderNumber,
            onValueChange = { orderNumber = it },
            modifier      = Modifier.fillMaxWidth(),
            placeholder   = { Text("Order #", color = mutedColor) },
            colors        = fieldColors
        )
        Spacer(Modifier.height(12.dp))

        // Marketplace chips
        FormLabel("Marketplace", mutedColor)
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier              = Modifier.fillMaxWidth()
        ) {
            MARKETPLACES.forEach { m ->
                FilterChip(
                    selected = marketplace == m,
                    onClick  = { marketplace = m },
                    label    = { Text(m, fontSize = 12.sp) }
                )
            }
        }
        Spacer(Modifier.height(12.dp))

        // Seller Name
        FormLabel("Seller Name", mutedColor)
        OutlinedTextField(
            value         = sellerName,
            onValueChange = { sellerName = it },
            modifier      = Modifier.fillMaxWidth(),
            placeholder   = { Text("Seller name", color = mutedColor) },
            colors        = fieldColors
        )
        Spacer(Modifier.height(12.dp))

        // Product Price
        FormLabel("Product Price ($)", mutedColor)
        OutlinedTextField(
            value         = price,
            onValueChange = { price = it },
            modifier      = Modifier.fillMaxWidth(),
            placeholder   = { Text("0.00", color = mutedColor) },
            colors        = fieldColors
        )
        Spacer(Modifier.height(12.dp))

        // Commission Amount
        FormLabel("Commission Amount ($)", mutedColor)
        OutlinedTextField(
            value         = commissionAmount,
            onValueChange = { commissionAmount = it },
            modifier      = Modifier.fillMaxWidth(),
            placeholder   = { Text("0.00", color = mutedColor) },
            colors        = fieldColors
        )
        Spacer(Modifier.height(12.dp))

        // PayPal Account chips
        FormLabel("PayPal Account", mutedColor)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PAYPAL_ACCOUNTS.forEach { pp ->
                FilterChip(
                    selected = paypalAccount == pp,
                    onClick  = { paypalAccount = pp },
                    label    = { Text(pp, fontSize = 12.sp) }
                )
            }
        }
        Spacer(Modifier.height(12.dp))

        // Review Type chips
        FormLabel("Review Type", mutedColor)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            REVIEW_TYPES.forEach { rt ->
                FilterChip(
                    selected = reviewType == rt,
                    onClick  = { reviewType = rt },
                    label    = { Text(rt, fontSize = 12.sp) }
                )
            }
        }
        Spacer(Modifier.height(32.dp))

        // Error message
        if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = MaterialTheme.colorScheme.error, fontSize = 14.sp)
            Spacer(Modifier.height(8.dp))
        }

        // Save button
        Button(
            onClick = {
                if (productName.isEmpty()) { errorMsg = "Product name is required"; return@Button }
                loading = true
                val data = hashMapOf<String, Any>(
                    "productName"      to productName,
                    "orderNumber"      to orderNumber,
                    "marketplace"      to marketplace,
                    "sellerName"       to sellerName,
                    "price"            to (price.toDoubleOrNull() ?: 0.0),
                    "commissionAmount" to (commissionAmount.toDoubleOrNull() ?: 0.0),
                    "paypalAccount"    to paypalAccount,
                    "reviewType"       to reviewType,
                    "userId"           to (auth.currentUser?.uid ?: "")
                )
                if (isNew) {
                    data["delivered"]        = false
                    data["reviewWritten"]    = false
                    data["paymentReceived"]  = false
                    data["amountCredited"]   = 0.0
                    data["deliveredAt"]      = Timestamp(0, 0)
                    data["reviewWrittenAt"]  = Timestamp(0, 0)
                    data["paymentReceivedAt"]= Timestamp(0, 0)
                    data["createdAt"]        = Timestamp.now()
                    db.collection("orders").add(data)
                        .addOnSuccessListener { onSaved() }
                        .addOnFailureListener { e -> errorMsg = e.message ?: "Error"; loading = false }
                } else {
                    db.collection("orders").document(orderId).update(data)
                        .addOnSuccessListener { onSaved() }
                        .addOnFailureListener { e -> errorMsg = e.message ?: "Error"; loading = false }
                }
            },
            modifier  = Modifier.fillMaxWidth().height(50.dp),
            shape     = RoundedCornerShape(8.dp),
            colors    = ButtonDefaults.buttonColors(containerColor = AccentBlue),
            enabled   = !loading
        ) {
            if (loading) CircularProgressIndicator(
                color    = MaterialTheme.colorScheme.onPrimary,
                modifier = Modifier.size(20.dp)
            )
            else Text(
                if (isNew) "Add Order" else "Update Order",
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(Modifier.height(12.dp))

        // Cancel button
        OutlinedButton(
            onClick  = onCancel,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape    = RoundedCornerShape(8.dp)
        ) {
            Text("Cancel", color = mutedColor)
        }
    }
}

// ── Reusable label ────────────────────────────────────────────────────────────
@Composable
fun FormLabel(text: String, color: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Text(text, color = color, fontSize = 13.sp, modifier = Modifier.padding(bottom = 4.dp))
}

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

val MARKETPLACES = listOf("Amazon", "Walmart", "Temu", "Shein", "Other")
val PAYPAL_ACCOUNTS = listOf("Shanu PP", "Jisa PP")
val REVIEW_TYPES = listOf("text", "text+pic")

@Composable
fun AddEditScreen(orderId: String, onSaved: () -> Unit, onCancel: () -> Unit) {
    val db = FirebaseFirestore.getInstance()
    val auth = FirebaseAuth.getInstance()
    val isNew = orderId == "new"

    var productName by remember { mutableStateOf("") }
    var orderNumber by remember { mutableStateOf("") }
    var marketplace by remember { mutableStateOf("Amazon") }
    var sellerName by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var commissionAmount by remember { mutableStateOf("0") }
    var paypalAccount by remember { mutableStateOf("Shanu PP") }
    var reviewType by remember { mutableStateOf("text") }
    var loading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }

    LaunchedEffect(orderId) {
        if (!isNew) {
            db.collection("orders").document(orderId).get()
                .addOnSuccessListener { doc ->
                    productName = doc.getString("productName") ?: ""
                    orderNumber = doc.getString("orderNumber") ?: ""
                    marketplace = doc.getString("marketplace") ?: "Amazon"
                    sellerName = doc.getString("sellerName") ?: ""
                    price = (doc.getDouble("price") ?: 0.0).toString()
                    commissionAmount = (doc.getDouble("commissionAmount") ?: 0.0).toString()
                    paypalAccount = doc.getString("paypalAccount") ?: "Shanu PP"
                    reviewType = doc.getString("reviewType") ?: "text"
                }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
    ) {
        Text(
            if (isNew) "Add Order" else "Edit Order",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        Spacer(modifier = Modifier.height(24.dp))

        FormLabel("Product Name *")
        OutlinedTextField(
            value = productName,
            onValueChange = { productName = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Product name", color = Color.Gray) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("Order Number")
        OutlinedTextField(
            value = orderNumber,
            onValueChange = { orderNumber = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Order #", color = Color.Gray) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("Marketplace")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            MARKETPLACES.forEach { m ->
                FilterChip(
                    selected = marketplace == m,
                    onClick = { marketplace = m },
                    label = { Text(m, fontSize = 12.sp) }
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("Seller Name")
        OutlinedTextField(
            value = sellerName,
            onValueChange = { sellerName = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Seller name", color = Color.Gray) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("Product Price ($)")
        OutlinedTextField(
            value = price,
            onValueChange = { price = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("0.00", color = Color.Gray) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("Commission Amount ($)")
        OutlinedTextField(
            value = commissionAmount,
            onValueChange = { commissionAmount = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("0.00", color = Color.Gray) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("PayPal Account")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PAYPAL_ACCOUNTS.forEach { pp ->
                FilterChip(
                    selected = paypalAccount == pp,
                    onClick = { paypalAccount = pp },
                    label = { Text(pp, fontSize = 12.sp) }
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        FormLabel("Review Type")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            REVIEW_TYPES.forEach { rt ->
                FilterChip(
                    selected = reviewType == rt,
                    onClick = { reviewType = rt },
                    label = { Text(rt, fontSize = 12.sp) }
                )
            }
        }
        Spacer(modifier = Modifier.height(32.dp))

        if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = Color.Red, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
        }

        Button(
            onClick = {
                if (productName.isEmpty()) { errorMsg = "Product name is required"; return@Button }
                loading = true
                val data = hashMapOf<String, Any>(
                    "productName" to productName,
                    "orderNumber" to orderNumber,
                    "marketplace" to marketplace,
                    "sellerName" to sellerName,
                    "price" to (price.toDoubleOrNull() ?: 0.0),
                    "commissionAmount" to (commissionAmount.toDoubleOrNull() ?: 0.0),
                    "paypalAccount" to paypalAccount,
                    "reviewType" to reviewType,
                    "userId" to (auth.currentUser?.uid ?: "")
                )
                if (isNew) {
                    data["delivered"] = false
                    data["reviewWritten"] = false
                    data["paymentReceived"] = false
                    data["amountCredited"] = 0.0
                    data["deliveredAt"] = Timestamp(0, 0)
                    data["reviewWrittenAt"] = Timestamp(0, 0)
                    data["paymentReceivedAt"] = Timestamp(0, 0)
                    data["createdAt"] = Timestamp.now()
                    db.collection("orders").add(data)
                        .addOnSuccessListener { onSaved() }
                        .addOnFailureListener { e -> errorMsg = e.message ?: "Error"; loading = false }
                } else {
                    db.collection("orders").document(orderId).update(data)
                        .addOnSuccessListener { onSaved() }
                        .addOnFailureListener { e -> errorMsg = e.message ?: "Error"; loading = false }
                }
            },
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(containerColor = AccentBlue),
            enabled = !loading
        ) {
            if (loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
            else Text(if (isNew) "Add Order" else "Update Order", fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth().height(50.dp),
            shape = RoundedCornerShape(8.dp)
        ) {
            Text("Cancel", color = Color.Gray)
        }
    }
}

@Composable
fun FormLabel(text: String) {
    Text(text, color = Color.Gray, fontSize = 13.sp, modifier = Modifier.padding(bottom = 4.dp))
}

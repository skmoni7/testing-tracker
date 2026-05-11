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

@Composable
fun AddEditScreen(orderId: String, onSaved: () -> Unit, onCancel: () -> Unit) {
    val db = FirebaseFirestore.getInstance()
    val auth = FirebaseAuth.getInstance()
    val isNew = orderId == "new"

    var productName by remember { mutableStateOf("") }
    var orderNumber by remember { mutableStateOf("") }
    var marketplace by remember { mutableStateOf("Amazon") }
    var sellerName by remember { mutableStateOf("") }
    var productAmount by remember { mutableStateOf("") }
    var commissionAmount by remember { mutableStateOf("0") }
    var loading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }

    // Load existing order if editing
    LaunchedEffect(orderId) {
        if (!isNew) {
            db.collection("orders").document(orderId).get()
                .addOnSuccessListener { doc ->
                    productName = doc.getString("productName") ?: ""
                    orderNumber = doc.getString("orderNumber") ?: ""
                    marketplace = doc.getString("marketplace") ?: "Amazon"
                    sellerName = doc.getString("sellerName") ?: ""
                    productAmount = (doc.getDouble("productAmount") ?: 0.0).toString()
                    commissionAmount = (doc.getDouble("commissionAmount") ?: 0.0).toString()
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

        // Product Name
        FormLabel("Product Name *")
        OutlinedTextField(
            value = productName,
            onValueChange = { productName = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Product name", color = Color.Gray) },
            colors = fieldColors()
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Order Number
        FormLabel("Order Number")
        OutlinedTextField(
            value = orderNumber,
            onValueChange = { orderNumber = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Order #", color = Color.Gray) },
            colors = fieldColors()
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Marketplace selector
        FormLabel("Marketplace")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            MARKETPLACES.forEach { m ->
                FilterChip(
                    selected = marketplace == m,
                    onClick = { marketplace = m },
                    label = { Text(m, fontSize = 12.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = AccentBlue,
                        selectedLabelColor = Color.White,
                        labelColor = Color.Gray
                    )
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        // Seller Name
        FormLabel("Seller Name")
        OutlinedTextField(
            value = sellerName,
            onValueChange = { sellerName = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Seller name", color = Color.Gray) },
            colors = fieldColors()
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Product Amount
        FormLabel("Product Amount ($)")
        OutlinedTextField(
            value = productAmount,
            onValueChange = { productAmount = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("0.00", color = Color.Gray) },
            colors = fieldColors()
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Commission Amount
        FormLabel("Commission Amount ($)")
        OutlinedTextField(
            value = commissionAmount,
            onValueChange = { commissionAmount = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("0.00", color = Color.Gray) },
            colors = fieldColors()
        )
        Spacer(modifier = Modifier.height(32.dp))

        // Error message
        if (errorMsg.isNotEmpty()) {
            Text(errorMsg, color = Color.Red, fontSize = 14.sp)
            Spacer(modifier = Modifier.height(8.dp))
        }

        // Save button
        Button(
            onClick = {
                if (productName.isEmpty()) { errorMsg = "Product name is required"; return@Button }
                loading = true
                val data = hashMapOf(
                    "productName" to productName,
                    "orderNumber" to orderNumber,
                    "marketplace" to marketplace,
                    "sellerName" to sellerName,
                    "productAmount" to (productAmount.toDoubleOrNull() ?: 0.0),
                    "commissionAmount" to (commissionAmount.toDoubleOrNull() ?: 0.0),
                    "userId" to (auth.currentUser?.uid ?: "")
                )
                if (isNew) {
                    data["delivered"] = false
                    data["reviewWritten"] = false
                    data["paymentReceived"] = false
                    data["amtCr"] = 0.0
                    data["createdAt"] = Timestamp.now()
                    db.collection("orders").add(data)
                        .addOnSuccessListener { onSaved() }
                        .addOnFailureListener { e -> errorMsg = e.message ?: "Error"; loading = false }
                } else {
                    db.collection("orders").document(orderId).update(data as Map<String, Any>)
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

        // Cancel button
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

@Composable
fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedBorderColor = AccentBlue,
    unfocusedBorderColor = Color(0xFF333333),
    containerColor = DarkCard
)

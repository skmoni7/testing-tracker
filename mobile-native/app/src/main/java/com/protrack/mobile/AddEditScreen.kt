package com.protrack.mobile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    var productAmount by remember { mutableStateOf("0") }
    var commissionAmount by remember { mutableStateOf("0") }
    var loading by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

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
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        Text(
            text = if (isNew) "Add Order" else "Edit Order",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF6200EE),
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (errorMsg.isNotEmpty()) {
            Text(text = errorMsg, color = Color.Red, modifier = Modifier.padding(bottom = 8.dp))
        }

        OutlinedTextField(
            value = productName,
            onValueChange = { productName = it },
            label = { Text("Product Name") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        )

        OutlinedTextField(
            value = orderNumber,
            onValueChange = { orderNumber = it },
            label = { Text("Order Number") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        )

        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded },
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        ) {
            OutlinedTextField(
                value = marketplace,
                onValueChange = {},
                readOnly = true,
                label = { Text("Marketplace") },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier.menuAnchor().fillMaxWidth()
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                MARKETPLACES.forEach { option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            marketplace = option
                            expanded = false
                        }
                    )
                }
            }
        }

        OutlinedTextField(
            value = sellerName,
            onValueChange = { sellerName = it },
            label = { Text("Seller Name") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        )

        OutlinedTextField(
            value = productAmount,
            onValueChange = { productAmount = it },
            label = { Text("Product Amount") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        )

        OutlinedTextField(
            value = commissionAmount,
            onValueChange = { commissionAmount = it },
            label = { Text("Commission Amount") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
        )

        Button(
            onClick = {
                loading = true
                val userId = auth.currentUser?.uid ?: ""
                val data = hashMapOf(
                    "productName" to productName,
                    "orderNumber" to orderNumber,
                    "marketplace" to marketplace,
                    "sellerName" to sellerName,
                    "productAmount" to (productAmount.toDoubleOrNull() ?: 0.0),
                    "commissionAmount" to (commissionAmount.toDoubleOrNull() ?: 0.0),
                    "userId" to userId
                )
                val task = if (isNew) {
                    db.collection("orders").add(data)
                } else {
                    db.collection("orders").document(orderId).set(data).let { null }
                    null
                }
                if (!isNew) {
                    db.collection("orders").document(orderId).set(data)
                        .addOnSuccessListener { loading = false; onSaved() }
                        .addOnFailureListener { loading = false; errorMsg = it.message ?: "Error" }
                } else {
                    db.collection("orders").add(data)
                        .addOnSuccessListener { loading = false; onSaved() }
                        .addOnFailureListener { loading = false; errorMsg = it.message ?: "Error" }
                }
            },
            enabled = !loading,
            modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
        ) {
            if (loading) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
            } else {
                Text(if (isNew) "Add Order" else "Update Order", fontWeight = FontWeight.Bold)
            }
        }

        OutlinedButton(
            onClick = onCancel,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Cancel")
        }
    }
}

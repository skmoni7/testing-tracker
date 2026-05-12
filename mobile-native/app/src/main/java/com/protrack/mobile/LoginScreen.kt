@file:OptIn(ExperimentalMaterial3Api::class)
package com.protrack.mobile

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.FirebaseAuth

val DarkBg = Color(0xFF1a1a2e)
val DarkCard = Color(0xFF16213e)
val AccentBlue = Color(0xFF4f8ef7)

@Composable
fun LoginScreen(onLoginSuccess: () -> Unit) {
    val auth = FirebaseAuth.getInstance()
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("protrack_prefs", Context.MODE_PRIVATE)

    var email by remember { mutableStateOf(prefs.getString("saved_email", "") ?: "") }
    var password by remember { mutableStateOf(prefs.getString("saved_password", "") ?: "") }
    var rememberMe by remember { mutableStateOf(prefs.getBoolean("remember_me", false)) }
    var errorMsg by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    // Auto-login if remember me was set and credentials saved
    LaunchedEffect(Unit) {
        if (rememberMe && email.isNotEmpty() && password.isNotEmpty()) {
            loading = true
            auth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener { onLoginSuccess() }
                .addOnFailureListener { loading = false }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(DarkBg)
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(24.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("ProTrack", fontSize = 36.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Order Tracker", fontSize = 14.sp, color = Color.Gray)
            Spacer(modifier = Modifier.height(40.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email", color = Color.Gray) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = AccentBlue,
                    unfocusedBorderColor = Color.Gray
                )
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password", color = Color.Gray) },
                modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = AccentBlue,
                    unfocusedBorderColor = Color.Gray
                )
            )
            Spacer(modifier = Modifier.height(12.dp))

            // Remember me for 30 days checkbox
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = rememberMe,
                    onCheckedChange = { rememberMe = it },
                    colors = CheckboxDefaults.colors(checkedColor = AccentBlue)
                )
                Text("Remember me for 30 days", color = Color.Gray, fontSize = 13.sp)
            }
            Spacer(modifier = Modifier.height(8.dp))

            if (errorMsg.isNotEmpty()) {
                Text(errorMsg, color = Color.Red, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(8.dp))
            }

            Button(
                onClick = {
                    loading = true
                    auth.signInWithEmailAndPassword(email, password)
                        .addOnSuccessListener {
                            // Save credentials if remember me checked
                            if (rememberMe) {
                                prefs.edit()
                                    .putString("saved_email", email)
                                    .putString("saved_password", password)
                                    .putBoolean("remember_me", true)
                                    .apply()
                            } else {
                                prefs.edit()
                                    .remove("saved_email")
                                    .remove("saved_password")
                                    .putBoolean("remember_me", false)
                                    .apply()
                            }
                            onLoginSuccess()
                        }
                        .addOnFailureListener { e ->
                            errorMsg = e.message ?: "Login failed"
                            loading = false
                        }
                },
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                enabled = !loading,
                colors = ButtonDefaults.buttonColors(containerColor = AccentBlue),
                shape = RoundedCornerShape(8.dp)
            ) {
                if (loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                else Text("Login", fontWeight = FontWeight.Bold)
            }
        }

        // Footer
        Text(
            text = "developed by skm",
            fontSize = 9.sp,
            color = Color(0xFF444444),
            textAlign = TextAlign.Center,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp)
                .fillMaxWidth()
        )
    }
}

package com.protrack.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.*
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.google.firebase.auth.FirebaseAuth
import com.protrack.mobile.ui.theme.ProTrackTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var isDarkTheme by remember { mutableStateOf(true) }
            ProTrackTheme(isDarkTheme = isDarkTheme) {
                ProTrackApp(
                    isDarkTheme   = isDarkTheme,
                    onToggleTheme = { isDarkTheme = !isDarkTheme }
                )
            }
        }
    }
}

@Composable
fun ProTrackApp(
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit
) {
    val navController = rememberNavController()
    val auth = FirebaseAuth.getInstance()
    var isLoggedIn by remember { mutableStateOf(auth.currentUser != null) }

    DisposableEffect(Unit) {
        val listener = FirebaseAuth.AuthStateListener { fa ->
            isLoggedIn = fa.currentUser != null
        }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }

    NavHost(
        navController    = navController,
        startDestination = if (isLoggedIn) "dashboard" else "login"
    ) {
        composable("login") {
            LoginScreen(onLoginSuccess = {
                navController.navigate("dashboard") {
                    popUpTo("login") { inclusive = true }
                }
            })
        }
        composable("dashboard") {
            DashboardScreen(
                isDarkTheme   = isDarkTheme,
                onToggleTheme = onToggleTheme,
                onAddOrder    = { navController.navigate("addedit/new") },
                onEditOrder   = { id -> navController.navigate("addedit/$id") },
                onLogout      = {
                    auth.signOut()
                    navController.navigate("login") {
                        popUpTo("dashboard") { inclusive = true }
                    }
                }
            )
        }
        composable("addedit/{orderId}") { back ->
            val orderId = back.arguments?.getString("orderId") ?: "new"
            AddEditScreen(
                orderId  = orderId,
                onSaved  = { navController.popBackStack() },
                onCancel = { navController.popBackStack() }
            )
        }
    }
}

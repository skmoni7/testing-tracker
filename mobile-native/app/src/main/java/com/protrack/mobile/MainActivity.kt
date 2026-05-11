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
            ProTrackTheme {
                ProTrackApp()
            }
        }
    }
}

@Composable
fun ProTrackApp() {
    val navController = rememberNavController()
    val auth = FirebaseAuth.getInstance()
    var isLoggedIn by remember { mutableStateOf(auth.currentUser != null) }

    // Auth state listener
    DisposableEffect(Unit) {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            isLoggedIn = firebaseAuth.currentUser != null
        }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }

    NavHost(
        navController = navController,
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
                onAddOrder = { navController.navigate("addedit/new") },
                onEditOrder = { orderId -> navController.navigate("addedit/$orderId") },
                onLogout = {
                    auth.signOut()
                    navController.navigate("login") {
                        popUpTo("dashboard") { inclusive = true }
                    }
                }
            )
        }
        composable("addedit/{orderId}") { backStackEntry ->
            val orderId = backStackEntry.arguments?.getString("orderId") ?: "new"
            AddEditScreen(
                orderId = orderId,
                onSaved = { navController.popBackStack() },
                onCancel = { navController.popBackStack() }
            )
        }
    }
}

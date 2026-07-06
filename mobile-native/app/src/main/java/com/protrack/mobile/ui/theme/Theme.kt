package com.protrack.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ── Accent colors (single source of truth) ──────────────────────────────────
val AccentBlue = Color(0xFF2196F3)
val AccentTeal = Color(0xFF00BCD4)

// ── Dark palette ─────────────────────────────────────────────────────────────
private val DarkColors = darkColorScheme(
    primary            = AccentBlue,
    onPrimary          = Color.White,
    secondary          = AccentTeal,
    background         = Color(0xFF121212),
    onBackground       = Color(0xFFE0E0E0),
    surface            = Color(0xFF1E1E1E),
    onSurface          = Color(0xFFE0E0E0),
    surfaceVariant     = Color(0xFF2C2C2C),
    onSurfaceVariant   = Color(0xFFCCCCCC),
    outline            = Color(0xFF555555),
)

// ── Light palette ─────────────────────────────────────────────────────────────
private val LightColors = lightColorScheme(
    primary            = AccentBlue,
    onPrimary          = Color.White,
    secondary          = AccentTeal,
    background         = Color(0xFFF5F5F5),
    onBackground       = Color(0xFF1A1A1A),
    surface            = Color(0xFFFFFFFF),
    onSurface          = Color(0xFF1A1A1A),
    surfaceVariant     = Color(0xFFEEEEEE),
    onSurfaceVariant   = Color(0xFF444444),
    outline            = Color(0xFFBBBBBB),
)

@Composable
fun ProTrackTheme(
    isDarkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (isDarkTheme) DarkColors else LightColors,
        content     = content
    )
}

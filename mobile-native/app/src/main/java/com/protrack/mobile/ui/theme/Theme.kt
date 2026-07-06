package com.protrack.mobile.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ── ProTrack Accent Colors ──────────────────────────────────────────────────
val AccentBlue   = Color(0xFF2196F3)
val AccentTeal   = Color(0xFF00BCD4)

// ── Dark palette ─────────────────────────────────────────────────────────────
val DarkBg       = Color(0xFF121212)
val DarkSurface  = Color(0xFF1E1E1E)
val DarkOnSurface = Color(0xFFE0E0E0)   // readable text on dark

// ── Light palette ────────────────────────────────────────────────────────────
val LightBg      = Color(0xFFF5F5F5)
val LightSurface = Color(0xFFFFFFFF)
val LightOnSurface = Color(0xFF1A1A1A) // readable text on light

private val DarkColors = darkColorScheme(
    primary            = AccentBlue,
    onPrimary          = Color.White,
    secondary          = AccentTeal,
    background         = DarkBg,
    onBackground       = DarkOnSurface,
    surface            = DarkSurface,
    onSurface          = DarkOnSurface,
    surfaceVariant     = Color(0xFF2C2C2C),
    onSurfaceVariant   = Color(0xFFCCCCCC),
    outline            = Color(0xFF555555),
)

private val LightColors = lightColorScheme(
    primary            = AccentBlue,
    onPrimary          = Color.White,
    secondary          = AccentTeal,
    background         = LightBg,
    onBackground       = LightOnSurface,
    surface            = LightSurface,
    onSurface          = LightOnSurface,
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
        content = content
    )
}

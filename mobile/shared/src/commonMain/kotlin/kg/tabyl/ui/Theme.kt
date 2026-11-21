package kg.tabyl.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import kg.tabyl.res.Res
import kg.tabyl.res.rubik_bold
import kg.tabyl.res.rubik_medium
import kg.tabyl.res.rubik_regular
import org.jetbrains.compose.resources.Font

/** The website's «Мягкое» tokens, one-to-one. */
@Immutable
data class Tokens(
    val page: Color, val bg: Color, val fg: Color, val mut: Color, val line: Color, val field: Color,
    val card: Color, val ink: Color, val onInk: Color, val sun: Color, val onSun: Color, val mine: Color,
    val danger: Color, val ok: Color,
)

val Light = Tokens(
    page = Color(0xFFEDE6D7), bg = Color(0xFFFBF7EE), fg = Color(0xFF1D1A12), mut = Color(0xFF6F6857),
    line = Color(0xFFE9E1CF), field = Color(0xFFF1EBDD), card = Color(0xFFFFFFFF), ink = Color(0xFF1D1A12),
    onInk = Color(0xFFFBF7EE), sun = Color(0xFFFFD43B), onSun = Color(0xFF1D1A12), mine = Color(0xFFFFEDA6),
    danger = Color(0xFFB3321A), ok = Color(0xFF1F7A4D),
)
val Dark = Tokens(
    page = Color(0xFF0B0A07), bg = Color(0xFF17150F), fg = Color(0xFFF4EFE2), mut = Color(0xFFA29B88),
    line = Color(0xFF2B271D), field = Color(0xFF221F17), card = Color(0xFF1C1A13), ink = Color(0xFFF4EFE2),
    onInk = Color(0xFF14120D), sun = Color(0xFFFFD43B), onSun = Color(0xFF1D1A12), mine = Color(0xFF3B3317),
    danger = Color(0xFFFF8A6B), ok = Color(0xFF5FD09A),
)

val LocalTokens = staticCompositionLocalOf { Light }
val T: Tokens @Composable get() = LocalTokens.current

@Composable
fun rubik() = FontFamily(
    Font(Res.font.rubik_regular, FontWeight.Normal),
    Font(Res.font.rubik_medium, FontWeight.Medium),
    Font(Res.font.rubik_bold, FontWeight.Bold),
)

@Composable
fun TabylTheme(dark: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val t = if (dark) Dark else Light
    val f = rubik()
    val base = TextStyle(fontFamily = f, color = t.fg)
    val type = Typography(
        bodyLarge = base.copy(fontSize = 16.sp, lineHeight = 23.sp),
        bodyMedium = base.copy(fontSize = 15.sp, lineHeight = 21.sp),
        bodySmall = base.copy(fontSize = 13.sp, lineHeight = 18.sp, color = t.mut),
        titleLarge = base.copy(fontSize = 22.sp, lineHeight = 27.sp, fontWeight = FontWeight.Medium),
        titleMedium = base.copy(fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.Medium),
        titleSmall = base.copy(fontSize = 15.sp, lineHeight = 20.sp, fontWeight = FontWeight.Medium),
        labelLarge = base.copy(fontSize = 15.sp, fontWeight = FontWeight.Medium),
        labelMedium = base.copy(fontSize = 13.sp, fontWeight = FontWeight.Medium),
        labelSmall = base.copy(fontSize = 11.sp),
    )
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = t.ink, onPrimary = t.onInk, secondary = t.sun, onSecondary = t.onSun,
        background = t.page, onBackground = t.fg, surface = t.bg, onSurface = t.fg,
        surfaceVariant = t.field, onSurfaceVariant = t.mut, outline = t.line, error = t.danger,
        surfaceContainerLow = t.bg, surfaceContainer = t.bg, surfaceContainerHigh = t.bg,
    )
    androidx.compose.runtime.CompositionLocalProvider(LocalTokens provides t) {
        MaterialTheme(colorScheme = scheme, typography = type, content = content)
    }
}

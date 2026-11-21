package kg.tabyl.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.staggeredgrid.LazyStaggeredGridState
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridItemSpan
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.lazy.staggeredgrid.rememberLazyStaggeredGridState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import kg.tabyl.data.Card
import kg.tabyl.data.formatPrice
import kg.tabyl.data.isFresh
import kg.tabyl.data.relativeTime
import kotlinx.coroutines.flow.distinctUntilChanged

/** A content island: cream panel with large rounded corners. */
@Composable
fun Island(modifier: Modifier = Modifier, padding: PaddingValues = PaddingValues(16.dp), content: @Composable () -> Unit) {
    Box(modifier.clip(RoundedCornerShape(24.dp)).background(T.bg).padding(padding)) { content() }
}

/** Every tappable surface gives a little under the finger. */
@Composable
fun Modifier.press(onClick: () -> Unit, label: String? = null): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.97f else 1f, spring(stiffness = Spring.StiffnessMediumLow), label = "press")
    return this.scale(s).clickable(source, indication = null, role = Role.Button, onClick = onClick)
        .then(if (label != null) Modifier.semantics { contentDescription = label } else Modifier)
}

enum class Kind { Ink, Sun, Field }

@Composable
fun Btn(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, kind: Kind = Kind.Ink, icon: ImageVector? = null, enabled: Boolean = true) {
    val (bg, fg) = when (kind) {
        Kind.Ink -> T.ink to T.onInk
        Kind.Sun -> T.sun to T.onSun
        Kind.Field -> T.field to T.fg
    }
    Row(
        modifier.heightIn(min = 50.dp).clip(RoundedCornerShape(14.dp)).background(if (enabled) bg else bg.copy(alpha = .5f))
            .then(if (enabled) Modifier.press(onClick) else Modifier).padding(horizontal = 18.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) Icon(icon, null, Modifier.size(20.dp), tint = fg)
        Text(text, color = fg, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun IconBtn(icon: ImageVector, label: String, onClick: () -> Unit, modifier: Modifier = Modifier, bg: Color = Color.Transparent, tint: Color = T.fg, size: Dp = 44.dp) {
    Box(modifier.size(size).clip(RoundedCornerShape(12.dp)).background(bg).press(onClick, label), contentAlignment = Alignment.Center) {
        Icon(icon, label, Modifier.size(22.dp), tint = tint)
    }
}

/** Text field in the website's style: filled, rounded, 16 sp so phones never zoom. */
@Composable
fun Field(
    value: String, onChange: (String) -> Unit, label: String, modifier: Modifier = Modifier, placeholder: String = "",
    error: String? = null, keyboard: KeyboardType = KeyboardType.Text, lines: Int = 1, prefix: String? = null,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (label.isNotEmpty()) Text(label, style = MaterialTheme.typography.bodySmall)
        BasicTextField(
            value = value, onValueChange = onChange, singleLine = lines == 1, minLines = lines,
            keyboardOptions = KeyboardOptions(keyboardType = keyboard),
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = T.fg),
            modifier = Modifier.fillMaxWidth().semantics { contentDescription = label.ifEmpty { placeholder } },
            decorationBox = { inner ->
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 50.dp).clip(RoundedCornerShape(12.dp)).background(T.field)
                        .then(if (error != null) Modifier.border(2.dp, T.danger, RoundedCornerShape(12.dp)) else Modifier)
                        .padding(horizontal = 14.dp, vertical = 13.dp),
                    verticalAlignment = if (lines == 1) Alignment.CenterVertically else Alignment.Top,
                ) {
                    if (prefix != null) Text(prefix, color = T.mut, modifier = Modifier.padding(end = 8.dp), style = MaterialTheme.typography.bodyLarge)
                    Box(Modifier.weight(1f)) {
                        if (value.isEmpty()) Text(placeholder, color = T.mut, style = MaterialTheme.typography.bodyLarge)
                        inner()
                    }
                }
            },
        )
        if (error != null) Text(error, color = T.danger, style = MaterialTheme.typography.bodySmall.copy(color = T.danger))
    }
}

@Composable
fun PriceSticker(price: Long?, currency: String, big: Boolean = false) {
    val free = price == 0L
    Text(
        formatPrice(price, currency),
        color = if (free) T.sun else T.onSun,
        fontWeight = if (big) FontWeight.Bold else FontWeight.Medium,
        fontSize = if (big) 24.sp else 14.sp,
        modifier = Modifier.clip(RoundedCornerShape(if (big) 8.dp else 6.dp)).background(if (free) Color(0xFF1D1A12) else T.sun)
            .padding(horizontal = if (big) 10.dp else 8.dp, vertical = if (big) 3.dp else 2.dp),
    )
}

@Composable
fun Heart(on: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier, size: Dp = 36.dp, bg: Color = Color.Transparent) {
    val s by animateFloatAsState(if (on) 1f else 0.9f, spring(dampingRatio = 0.35f, stiffness = Spring.StiffnessMedium), label = "heart")
    Box(modifier.size(size).clip(RoundedCornerShape(12.dp)).background(bg).press(onClick, if (on) "Убрать из избранного" else "В избранное"), contentAlignment = Alignment.Center) {
        Icon(if (on) Icons.heartFilled else Icons.heart, null, Modifier.size(20.dp).scale(if (on) s * 1.08f else 1f), tint = T.fg)
    }
}

@Composable
fun AdCard(ad: Card, photoUrl: (String) -> String, fav: Boolean, onFav: () -> Unit, cityName: (String) -> String, onOpen: () -> Unit, modifier: Modifier = Modifier, square: Boolean = false) {
    Column(modifier.press(onOpen, ad.title)) {
        Box(Modifier.clip(RoundedCornerShape(14.dp)).background(T.field)) {
            val ratio = ad.photo?.let { p -> if (square || p.height == 0) 1f else (p.width.toFloat() / p.height).coerceIn(0.75f, 1.5f) } ?: (4f / 3f)
            if (ad.photo != null) {
                AsyncImage(model = photoUrl(ad.photo.id), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().aspectRatio(ratio))
            } else {
                Box(Modifier.fillMaxWidth().aspectRatio(ratio), contentAlignment = Alignment.Center) { Icon(Icons.camera, null, tint = T.mut) }
            }
            Box(Modifier.align(Alignment.BottomStart).padding(8.dp)) { PriceSticker(ad.price, ad.currency) }
            if (isFresh(ad.createdAt) && !ad.promoted) {
                Text("Новое", fontSize = 11.sp, fontWeight = FontWeight.Medium, modifier = Modifier.align(Alignment.TopStart).padding(8.dp).clip(CircleShape).background(T.bg.copy(alpha = .9f)).padding(horizontal = 8.dp, vertical = 2.dp))
            }
        }
        if (ad.promoted) Text("Реклама", style = MaterialTheme.typography.labelSmall.copy(color = T.mut), modifier = Modifier.padding(top = 6.dp))
        Text(ad.title, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = if (ad.promoted) 0.dp else 8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("${cityName(ad.city)} · ${relativeTime(ad.bumpedAt)}", style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Heart(fav, onFav)
        }
    }
}

/**
 * The staggered feed. [header] items span both columns; [onMore] fires when the
 * last cards come into view.
 */
@Composable
fun Feed(
    items: List<Card>, favs: Set<String>, photoUrl: (String) -> String, cityName: (String) -> String,
    onOpen: (Card) -> Unit, onFav: (Card) -> Unit, onMore: (() -> Unit)?, modifier: Modifier = Modifier,
    state: LazyStaggeredGridState = rememberLazyStaggeredGridState(),
    contentPadding: PaddingValues = PaddingValues(12.dp),
    header: (androidx.compose.foundation.lazy.staggeredgrid.LazyStaggeredGridScope.() -> Unit)? = null,
) {
    val nearEnd by remember { derivedStateOf { (state.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= state.layoutInfo.totalItemsCount - 6 } }
    LaunchedEffect(state, onMore) {
        snapshotFlow { nearEnd }.distinctUntilChanged().collect { if (it) onMore?.invoke() }
    }
    LazyVerticalStaggeredGrid(
        columns = StaggeredGridCells.Fixed(2), state = state, modifier = modifier,
        contentPadding = contentPadding, horizontalArrangement = Arrangement.spacedBy(10.dp), verticalItemSpacing = 16.dp,
    ) {
        header?.invoke(this)
        items(items, key = { it.id }) { ad ->
            AdCard(ad, photoUrl, ad.id in favs, { onFav(ad) }, cityName, { onOpen(ad) }, Modifier.animateItem())
        }
        item(span = StaggeredGridItemSpan.FullLine) { Spacer(Modifier.height(80.dp)) }
    }
}

@Composable
fun CategoryPill(name: String, icon: ImageVector, on: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.height(44.dp).clip(CircleShape).background(if (on) T.ink else T.field).press(onClick).padding(start = 4.dp, end = 14.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(if (on) T.sun else T.sun.copy(alpha = .4f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, Modifier.size(19.dp), tint = if (on) T.onSun else T.fg)
        }
        Text(name, color = if (on) T.onInk else T.fg, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
fun Avatar(name: String, size: Dp = 44.dp) {
    Box(Modifier.size(size).clip(CircleShape).background(T.field), contentAlignment = Alignment.Center) {
        Text(name.take(1).uppercase().ifEmpty { "П" }, style = MaterialTheme.typography.titleSmall)
    }
}

@Composable
fun Empty(title: String, text: String, action: String? = null, onAction: () -> Unit = {}) {
    Column(Modifier.fillMaxWidth().padding(vertical = 48.dp, horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        Text(text, style = MaterialTheme.typography.bodySmall)
        if (action != null) Btn(action, onAction, Modifier.padding(top = 8.dp), kind = Kind.Field)
    }
}

@Composable
fun ErrorLine(text: String?) {
    if (text != null) Text(text, color = T.danger, style = MaterialTheme.typography.bodySmall.copy(color = T.danger))
}

@Composable
fun TopBar(title: String, onBack: () -> Unit, actions: @Composable () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        IconBtn(Icons.back, "Назад", onBack)
        Text(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f).padding(start = 4.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
        actions()
    }
}

@Composable
fun Divider() = Box(Modifier.fillMaxWidth().height(1.dp).background(T.line))

@Composable
fun Gap(h: Dp) = Spacer(Modifier.height(h))

@Composable
fun HGap(w: Dp) = Spacer(Modifier.width(w))

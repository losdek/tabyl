package kg.tabyl.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kg.tabyl.AppState
import kg.tabyl.Prefs
import kg.tabyl.Route
import kg.tabyl.data.ApiException
import kg.tabyl.data.Photo
import kg.tabyl.data.attrText
import kg.tabyl.rememberPhotoPicker
import kg.tabyl.ui.Btn
import kg.tabyl.ui.ErrorLine
import kg.tabyl.ui.Field
import kg.tabyl.ui.Icons
import kg.tabyl.ui.T
import kg.tabyl.ui.TopBar
import kg.tabyl.ui.press
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject

@Composable
fun PostScreen(app: AppState, editId: String?) {
    val photos = remember { mutableStateListOf<Photo>() }
    var uploading by remember { mutableIntStateOf(0) }
    var category by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf("price") }
    var currency by remember { mutableStateOf("KGS") }
    var negotiable by remember { mutableStateOf(false) }
    var condition by remember { mutableStateOf("") }
    var city by remember { mutableStateOf(Prefs.get("city") ?: app.me?.city ?: "bishkek") }
    var district by remember { mutableStateOf("") }
    val attrs = remember { mutableStateMapOf<String, String>() }
    val errors = remember { mutableStateMapOf<String, String>() }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val cat = app.meta?.category(category)

    LaunchedEffect(editId) {
        if (editId == null) return@LaunchedEffect
        runCatching { app.api.ad(editId) }.onSuccess { d ->
            val a = d.ad
            photos.addAll(d.photos); category = a.category; title = a.title; description = a.description
            mode = when (a.price) { null -> "deal"; 0L -> "free"; else -> "price" }
            price = a.price?.takeIf { it > 0 }?.toString() ?: ""; currency = a.currency; negotiable = a.negotiable
            condition = a.condition ?: ""; city = a.city; district = a.district
            a.attrs.keys.forEach { k -> a.attrs.attrText(k)?.let { attrs[k] = it } }
        }
    }

    val pick = rememberPhotoPicker(10) { list ->
        list.take(10 - photos.size).forEach { bytes ->
            uploading++
            scope.launch {
                runCatching { app.api.upload(bytes) }.onSuccess { photos.add(it) }.onFailure { app.toast = it.message ?: "Фото не загрузилось" }
                uploading--
            }
        }
    }

    fun submit() = scope.launch {
        errors.clear()
        if (mode == "price" && price.isBlank()) { errors["price"] = "Укажите цену или выберите «Договорная»"; return@launch }
        val input = buildJsonObject {
            put("category", category); put("title", title); put("description", description)
            when (mode) {
                "deal" -> put("price", JsonNull)
                "free" -> put("price", 0)
                else -> put("price", price.filter(Char::isDigit).toLongOrNull() ?: 0)
            }
            put("currency", currency); put("negotiable", mode == "price" && negotiable)
            if (condition.isNotEmpty()) put("condition", condition) else put("condition", JsonNull)
            put("city", city); put("district", district)
            putJsonObject("attrs") {
                cat?.attrs?.forEach { a ->
                    val v = attrs[a.key] ?: return@forEach
                    if (a.kind == "bool") put(a.key, JsonPrimitive(v == "true")) else if (v.isNotBlank()) put(a.key, v)
                }
            }
            putJsonArray("photoIds") { photos.forEach { add(JsonPrimitive(it.id)) } }
        }
        busy = true
        runCatching {
            if (editId != null) { app.api.updateAd(editId, input); editId } else app.api.createAd(input).id
        }.onSuccess { id ->
            app.back()
            app.go(Route.Ad(id))
        }.onFailure { e ->
            val f = (e as? ApiException)?.fields ?: emptyMap()
            errors.putAll(f)
            if (f.isEmpty()) errors["_"] = e.message ?: "Не сохранилось"
        }
        busy = false
    }

    Column(Modifier.fillMaxSize().background(T.bg)) {
        TopBar(if (editId != null) "Редактирование" else "Новое объявление", { app.back() })
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
            Text("Фото · ${photos.size} из 10, первое — обложка", style = MaterialTheme.typography.bodySmall)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                itemsIndexed(photos, key = { _, p -> p.id }) { i, p ->
                    Box(Modifier.size(104.dp).clip(RoundedCornerShape(12.dp)).background(T.field).animateItem()) {
                        AsyncImage(app.api.photoUrl(p.id, 320), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        if (i == 0) Text("Обложка", style = MaterialTheme.typography.labelSmall.copy(color = T.onSun), modifier = Modifier.padding(6.dp).clip(RoundedCornerShape(6.dp)).background(T.sun).padding(horizontal = 6.dp, vertical = 1.dp))
                        Row(Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            if (i > 0) SmallBtn(Icons.back, "Сдвинуть левее") { photos.add(i - 1, photos.removeAt(i)) } else Box(Modifier.size(30.dp))
                            SmallBtn(Icons.close, "Убрать фото") { photos.removeAt(i) }
                        }
                    }
                }
                if (uploading > 0) item { Box(Modifier.size(104.dp).clip(RoundedCornerShape(12.dp)).background(T.field), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = T.ink, strokeWidth = 2.dp, modifier = Modifier.size(28.dp)) } }
                if (photos.size + uploading < 10) item {
                    Box(
                        Modifier.size(104.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, T.mut.copy(alpha = .5f), RoundedCornerShape(12.dp)).press({ pick(10 - photos.size) }, "Добавить фото"),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.camera, null, tint = T.mut); Text("Добавить", style = MaterialTheme.typography.bodySmall) }
                    }
                }
            }
            Text("Категория", style = MaterialTheme.typography.bodySmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                app.meta?.categories?.forEach { c ->
                    Chip(c.name, category == c.slug) { if (category != c.slug) { category = c.slug; attrs.clear(); currency = c.currency } }
                }
            }
            ErrorLine(errors["category"])
            Field(title, { title = it.take(80) }, "Название", placeholder = if (category == "transport") "Toyota Camry 70, 2019" else "Что продаёте?", error = errors["title"])
            cat?.attrs?.forEach { a ->
                val k = "attrs.${a.key}"
                when (a.kind) {
                    "bool" -> Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(attrs[a.key] == "true", { attrs[a.key] = it.toString() }, colors = CheckboxDefaults.colors(checkedColor = T.ink, checkmarkColor = T.onInk))
                        Text(a.label, style = MaterialTheme.typography.bodyMedium)
                    }
                    "select" -> Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(a.label + if (a.required == true) "" else " (необязательно)", style = MaterialTheme.typography.bodySmall)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            a.options?.forEach { o -> Chip(o, attrs[a.key] == o) { attrs[a.key] = o } }
                        }
                        ErrorLine(errors[k])
                    }
                    else -> Field(
                        attrs[a.key] ?: "", { attrs[a.key] = it }, a.label + (a.unit?.let { ", $it" } ?: "") + if (a.required == true) "" else " (необязательно)",
                        placeholder = a.placeholder ?: "", error = errors[k], keyboard = if (a.kind == "number") KeyboardType.Decimal else KeyboardType.Text,
                    )
                }
            }
            if (cat?.condition == true) Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("Новое", condition == "new") { condition = "new" }
                Chip("Б/у", condition == "used") { condition = "used" }
            }
            Text(cat?.priceLabel ?: "Цена", style = MaterialTheme.typography.bodySmall)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Chip("Цена", mode == "price") { mode = "price" }
                Chip("Договорная", mode == "deal") { mode = "deal" }
                Chip("Даром", mode == "free") { mode = "free" }
            }
            if (mode == "price") {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Bottom) {
                    Field(price, { price = it.filter(Char::isDigit).take(11) }, "", Modifier.weight(1f), placeholder = "Сумма", keyboard = KeyboardType.Number, error = errors["price"])
                    Chip("сом", currency == "KGS") { currency = "KGS" }
                    Chip("$", currency == "USD") { currency = "USD" }
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(negotiable, { negotiable = it }, colors = CheckboxDefaults.colors(checkedColor = T.ink, checkmarkColor = T.onInk))
                    Text("Возможен торг", style = MaterialTheme.typography.bodyMedium)
                }
            }
            Field(description, { description = it.take(4000) }, "Описание", placeholder = "Состояние, комплект, почему продаёте, где можно посмотреть", lines = 5, error = errors["description"])
            Text("Город", style = MaterialTheme.typography.bodySmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                app.meta?.cities?.forEach { c -> Chip(c.name, city == c.slug) { city = c.slug } }
            }
            Field(district, { district = it.take(60) }, "Район или микрорайон (необязательно)", placeholder = "Джал")
            ErrorLine(errors["_"] ?: if (errors.isNotEmpty()) "Проверьте отмеченные поля" else null)
        }
        Box(Modifier.fillMaxWidth().background(T.bg).navigationBarsPadding().padding(12.dp)) {
            Btn(
                when { busy -> "Сохраняем…"; uploading > 0 -> "Ждём загрузку фото…"; editId != null -> "Сохранить"; else -> "Опубликовать" },
                { submit() }, Modifier.fillMaxWidth(), enabled = !busy && uploading == 0,
            )
        }
    }
}

@Composable
private fun SmallBtn(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Box(Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(T.bg.copy(alpha = .92f)).press(onClick, label), contentAlignment = Alignment.Center) {
        Icon(icon, null, Modifier.size(16.dp), tint = T.fg)
    }
}

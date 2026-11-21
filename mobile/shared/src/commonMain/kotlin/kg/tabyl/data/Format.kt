package kg.tabyl.data

import kotlin.time.Clock
import kotlin.time.Duration.Companion.hours
import kotlin.time.ExperimentalTime
import kotlin.time.Instant

/** Russian formatting, matching web/src/lib/format.ts. */
const val NBSP = ' '

fun formatNumber(n: Long): String = n.toString().reversed().chunked(3).joinToString(NBSP.toString()).reversed()

fun formatPrice(price: Long?, currency: String): String = when {
    price == null -> "Договорная"
    price == 0L -> "Даром"
    currency == "USD" -> "${formatNumber(price)}$NBSP$"
    else -> "${formatNumber(price)}${NBSP}сом"
}

fun somHint(price: Long?, currency: String): String? {
    if (price == null || price == 0L || currency != "USD") return null
    val som = (price * 87 / 1000) * 1000
    return "≈$NBSP${formatNumber(som)}${NBSP}сом"
}

fun plural(n: Long, one: String, few: String, many: String): String {
    val m10 = n % 10
    val m100 = n % 100
    return when {
        m10 == 1L && m100 != 11L -> one
        m10 in 2..4 && m100 !in 12..14 -> few
        else -> many
    }
}

fun count(n: Long, one: String, few: String, many: String) = "${formatNumber(n)}$NBSP${plural(n, one, few, many)}"

fun formatPhone(e164: String): String {
    val m = Regex("^\\+996(\\d{3})(\\d{3})(\\d{3})$").find(e164) ?: return e164
    val (a, b, c) = m.destructured
    return "+996$NBSP$a$NBSP$b$NBSP$c"
}

private val MONTHS = listOf("января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря")

/** Bishkek is UTC+6 all year. */
@OptIn(ExperimentalTime::class)
private fun local(i: Instant): Triple<Long, Int, Int> {
    val secs = i.epochSeconds + 6 * 3600
    val day = secs.floorDiv(86_400L)
    val sod = secs.mod(86_400L).toInt()
    return Triple(day, sod / 3600, (sod % 3600) / 60)
}

private fun civil(day: Long): Triple<Int, Int, Int> {
    // days since 1970-01-01 → y/m/d (Howard Hinnant's algorithm)
    val z = day + 719468
    val era = z.floorDiv(146097L)
    val doe = z - era * 146097
    val yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
    val y = yoe + era * 400
    val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    val mp = (5 * doy + 2) / 153
    val d = (doy - (153 * mp + 2) / 5 + 1).toInt()
    val m = (if (mp < 10) mp + 3 else mp - 9).toInt()
    return Triple((if (m <= 2) y + 1 else y).toInt(), m, d)
}

private fun two(n: Int) = n.toString().padStart(2, '0')

@OptIn(ExperimentalTime::class)
fun clockTime(iso: String): String {
    val (_, h, m) = local(Instant.parse(iso))
    return "${two(h)}:${two(m)}"
}

@OptIn(ExperimentalTime::class)
fun relativeTime(iso: String): String {
    val t = Instant.parse(iso)
    val now = Clock.System.now()
    val diff = (now - t).inWholeSeconds
    if (diff < 60) return "только что"
    if (diff < 3600) return "${diff / 60}${NBSP}мин назад"
    val (d, h, m) = local(t)
    val (today) = local(now)
    if (d == today) return "сегодня в$NBSP${two(h)}:${two(m)}"
    if (d == today - 1) return "вчера в$NBSP${two(h)}:${two(m)}"
    val (y, mo, dd) = civil(d)
    val (ny) = civil(today)
    return "$dd$NBSP${MONTHS[mo - 1]}" + if (y != ny) " $y" else ""
}

@OptIn(ExperimentalTime::class)
fun lastSeen(iso: String): String {
    val diff = (Clock.System.now() - Instant.parse(iso)).inWholeSeconds
    if (diff < 180) return "в сети"
    if (diff < 3600) {
        val m = diff / 60
        return "был $m$NBSP${plural(m, "минуту", "минуты", "минут")} назад"
    }
    return "был ${relativeTime(iso)}"
}

@OptIn(ExperimentalTime::class)
fun isFresh(iso: String) = Clock.System.now() - Instant.parse(iso) < 24.hours

@OptIn(ExperimentalTime::class)
fun memberSince(iso: String): String {
    val (d) = local(Instant.parse(iso))
    val (y, m) = civil(d)
    return "на Табыле с$NBSP${MONTHS[m - 1]} $y"
}

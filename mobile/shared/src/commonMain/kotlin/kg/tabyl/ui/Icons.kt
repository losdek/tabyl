// Generated from web/src/ui/icons.tsx, CategoryIcon.tsx and logo-paths.ts — keep in sync with the website.
package kg.tabyl.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

private val cache = mutableMapOf<String, ImageVector>()

private fun stroke(name: String, d: String, width: Float = 1.7f): ImageVector = cache.getOrPut(name) {
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).addPath(
        pathData = addPathNodes(d), stroke = SolidColor(Color.Black), strokeLineWidth = width,
        strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round,
    ).build()
}

object Icons {
    val search: ImageVector get() = stroke("search", "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm10 3-5-5", 1.7f)
    val heart: ImageVector get() = stroke("heart", "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z", 1.7f)
    val home: ImageVector get() = stroke("home", "M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z", 1.7f)
    val plus: ImageVector get() = stroke("plus", "M12 5v14M5 12h14", 1.7f)
    val chat: ImageVector get() = stroke("chat", "M5 18.5V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v8a1.5 1.5 0 0 1-1.5 1.5H8z", 1.7f)
    val user: ImageVector get() = stroke("user", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0", 1.7f)
    val back: ImageVector get() = stroke("back", "m14.5 5-7 7 7 7", 1.7f)
    val next: ImageVector get() = stroke("next", "m9.5 5 7 7-7 7", 1.7f)
    val filter: ImageVector get() = stroke("filter", "M4 7h10m4 0h2M4 17h4m4 0h8M16 5v4M10 15v4", 1.7f)
    val phone: ImageVector get() = stroke("phone", "M6.6 4h2.6l1.3 4-1.9 1.2a11 11 0 0 0 6.2 6.2l1.2-1.9 4 1.3v2.6A1.6 1.6 0 0 1 18.4 19 14.4 14.4 0 0 1 5 5.6 1.6 1.6 0 0 1 6.6 4Z", 1.7f)
    val send: ImageVector get() = stroke("send", "m4 12 16-8-6 16-2.5-6.5z", 1.7f)
    val clip: ImageVector get() = stroke("clip", "m19 11-7.2 7.2a4.5 4.5 0 0 1-6.4-6.4l7.5-7.5a3 3 0 0 1 4.3 4.3l-7.3 7.3a1.5 1.5 0 0 1-2.1-2.1L14.5 7", 1.7f)
    val close: ImageVector get() = stroke("close", "M6 6l12 12M18 6 6 18", 1.7f)
    val camera: ImageVector get() = stroke("camera", "M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", 1.7f)
    val pin: ImageVector get() = stroke("pin", "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z", 1.7f)
    val flag: ImageVector get() = stroke("flag", "M5 21V4m0 0h11l-2 4 2 4H5", 1.7f)
    val star: ImageVector get() = stroke("star", "m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z", 1.7f)
    val up: ImageVector get() = stroke("up", "M12 19V6m-5 5 5-5 5 5", 1.7f)
    val check: ImageVector get() = stroke("check", "m5 12.5 4.5 4.5L19 7.5", 1.7f)
    val trash: ImageVector get() = stroke("trash", "M5 7h14M10 7V5h4v2m-6 0 .8 12h6.4L16 7", 1.7f)
    val edit: ImageVector get() = stroke("edit", "M5 19h4L19 9l-4-4L5 15zM13 7l4 4", 1.7f)
    val eye: ImageVector get() = stroke("eye", "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", 1.7f)
    val logout: ImageVector get() = stroke("logout", "M14 4h4a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 18 20h-4M10 16l-4-4 4-4M6 12h9", 1.7f)
    val shield: ImageVector get() = stroke("shield", "M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z", 1.7f)
    val wa: ImageVector get() = stroke("wa", "M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6zM9.2 8.6c.3 2.9 2.4 5.3 5.6 6l1-1.4-1.9-1-.9.8a4.6 4.6 0 0 1-2.3-2.3l.8-.9-1-1.9z", 1.7f)
    val more: ImageVector get() = stroke("more", "M5 12h.01M12 12h.01M19 12h.01", 3f)
    val bell: ImageVector get() = stroke("bell", "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5h4", 1.7f)

    /** Filled heart for favourites. */
    val heartFilled: ImageVector get() = cache.getOrPut("heartFilled") {
        ImageVector.Builder("heartFilled", 24.dp, 24.dp, 24f, 24f).addPath(
            pathData = addPathNodes("M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"),
            fill = SolidColor(Color.Black), stroke = SolidColor(Color.Black), strokeLineWidth = 1.7f, strokeLineJoin = StrokeJoin.Round,
        ).build()
    }

    fun category(slug: String): ImageVector = stroke("cat-$slug", CATEGORY[slug] ?: CATEGORY.getValue("hobby"))
}

private val CATEGORY = mapOf(
    "transport" to "M4 15.5V12l1.8-4.2A2 2 0 0 1 7.6 6.5h8.8a2 2 0 0 1 1.8 1.3L20 12v3.5a1 1 0 0 1-1 1h-1M6 16.5H5a1 1 0 0 1-1-1M4 12h16M8 16.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm11 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM8 16.5h8",
    "realty" to "M4 11 12 4.5l8 6.5M6 9.5V19h12V9.5M10 19v-5h4v5",
    "electronics" to "M8 3.5h8a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 19V5A1.5 1.5 0 0 1 8 3.5ZM11 17.5h2",
    "home" to "M5 11.5V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2.5M3.5 13a1.5 1.5 0 0 1 3 0v1h11v-1a1.5 1.5 0 0 1 3 0v4.5h-17zM5.5 17.5V19m13-1.5V19",
    "clothes" to "M9 4.5 4.5 7l1.5 4 2-.8V19.5h8V10.2l2 .8 1.5-4L15 4.5a3 3 0 0 1-6 0Z",
    "kids" to "M6 7.5a5.5 5.5 0 0 1 11 0H6Zm0 0V13a3 3 0 0 0 3 3h6l2-4.5H6M8.5 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm10 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
    "jobs" to "M4 8.5h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM9 8.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2.5M4 13h16",
    "services" to "M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z",
    "animals" to "M8 9a1.8 1.8 0 1 1 0-3.6A1.8 1.8 0 0 1 8 9Zm8 0a1.8 1.8 0 1 1 0-3.6A1.8 1.8 0 0 1 16 9ZM4.8 13a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Zm14.4 0a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2ZM12 12c-2.5 0-5 3.2-5 5.2 0 1.6 1.4 2.3 3 1.8.8-.3 1.3-.3 2-.3s1.2 0 2 .3c1.6.5 3-.2 3-1.8 0-2-2.5-5.2-5-5.2Z",
    "hobby" to "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17ZM12 3.5v17M3.5 12h17M6 6c3 2.5 3 9.5 0 12m12-12c-3 2.5-3 9.5 0 12",
)

/** The «табыл» wordmark: ink follows the text colour, the sun stays yellow. */
fun logo(ink: Color): ImageVector = ImageVector.Builder("logo", 111.7.dp, 28.dp, 3108f, 779f).apply {
    addGroup(translationX = -LOGO_X, translationY = -LOGO_Y)
    addPath(pathData = addPathNodes("""M1696 540C1696 443.4 1617.6 365 1521 365C1424.4 365 1346 443.4 1346 540C1346 636.6 1424.4 715 1521 715C1617.6 715 1696 636.6 1696 540Z"""), fill = SolidColor(Color(0xFFFFD43B)))
    addPath(pathData = addPathNodes("""M753 810Q699 810 656.5 789.5Q614 769 589 734Q564 699 564 655Q564 584 622 542.5Q680 501 776 486L901 467V453Q901 417 886 398Q871 379 831 379Q803 379 785.5 390Q768 401 758 420Q749 433 733 433H621Q610 433 604 426.5Q598 420 599 411Q599 393 612.5 369.5Q626 346 654 323Q682 300 726 285Q770 270 833 270Q897 270 943 285Q989 300 1018 327Q1047 354 1060.5 390.5Q1074 427 1074 471V775Q1074 785 1066.5 792.5Q1059 800 1049 800H933Q922 800 915 792.5Q908 785 908 775V740Q895 759 873 775Q851 791 821.5 800.5Q792 810 753 810ZM2610 800Q2599 800 2591.5 792.5Q2584 785 2584 774V687Q2584 665 2608 662Q2637 659 2652 635Q2667 611 2673 564Q2679 517 2679 446V305Q2679 294 2686.5 287Q2694 280 2704 280H3096Q3107 280 3114.5 287Q3122 294 3122 305V775Q3122 785 3114.5 792.5Q3107 800 3096 800H2978Q2968 800 2960.5 792.5Q2953 785 2953 775V411H2839V464Q2839 560 2829 625Q2819 690 2793 728Q2767 766 2722.5 783Q2678 800 2610 800ZM1830 800Q1819 800 1812 792.5Q1805 785 1805 775V305Q1805 294 1812 287Q1819 280 1830 280H1949Q1959 280 1966.5 287Q1974 294 1974 305V440H2065Q2166 440 2221 488.5Q2276 537 2276 622Q2276 709 2218.5 754.5Q2161 800 2059 800ZM1640.2 704.4C1590.9 768.6 1513.3 810 1426 810C1276.9 810 1156 689.1 1156 540C1156 522.2 1157.7 504.8 1161 487.9Q1161 484 1161 480Q1161 449 1162 420Q1164 336 1180 278.5Q1196 221 1228 182.5Q1260 144 1310.5 118Q1361 92 1432 72.5Q1503 53 1596 32Q1606 30 1615.5 35.5Q1625 41 1626 52L1643 144Q1645 155 1639.5 163Q1634 171 1625 173Q1547 188 1493.5 200.5Q1440 213 1406 229.5Q1372 246 1353.5 271.5Q1350 276.4 1346.9 281.8C1371.9 274.1 1398.5 270 1426 270C1513.3 270 1590.9 311.4 1640.2 375.6Q1621.6 362.1 1600 353Q1562.3 337 1521 337Q1479.7 337 1442 353Q1405.5 368.4 1377.5 396.5Q1349.4 424.5 1334 461Q1318 498.7 1318 540Q1318 581.3 1334 619Q1349.4 655.5 1377.5 683.5Q1405.5 711.6 1442 727Q1479.7 743 1521 743Q1562.3 743 1600 727Q1621.6 717.9 1640.2 704.4ZM216 800Q206 800 198.5 792.5Q191 785 191 775V411H39Q29 411 21.5 404Q14 397 14 386V305Q14 294 21.5 287Q29 280 39 280H509Q520 280 527 287Q534 294 534 305V386Q534 397 527 404Q520 411 509 411H357V775Q357 785 350 792.5Q343 800 332 800ZM2363 800Q2352 800 2344.5 792.5Q2337 785 2337 775V305Q2337 294 2344.5 287Q2352 280 2363 280H2481Q2491 280 2498.5 287Q2506 294 2506 305V775Q2506 785 2498.5 792.5Q2491 800 2481 800ZM1971 685H2050Q2089 685 2107 670Q2125 655 2125 622Q2125 588 2107.5 571Q2090 554 2050 554H1971ZM800 696Q829 696 852.5 683.5Q876 671 889.5 644.5Q903 618 903 578V564L818 579Q771 587 749.5 603.5Q728 620 728 642Q728 659 738 671Q748 683 764.5 689.5Q781 696 800 696Z"""), fill = SolidColor(ink))
    clearGroup()
}.build()

/** The viewBox origin of the logo paths, to translate them to 0,0. */
internal const val LOGO_X = 14f
internal const val LOGO_Y = 31f

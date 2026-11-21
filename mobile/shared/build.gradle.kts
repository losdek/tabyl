plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kmp.library)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.compose.compiler)
}

kotlin {
    android {
        namespace = "kg.tabyl.shared"
        compileSdk = 37
        minSdk = 26
        androidResources { enable = true }
    }
    // iOS targets are declared so the shared code stays iOS-ready; they are built on a Mac.
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation(libs.compose.runtime)
            implementation(libs.compose.foundation)
            implementation(libs.compose.ui)
            implementation(libs.compose.material3)
            implementation(libs.compose.resources)
            implementation(libs.ktor.core)
            implementation(libs.ktor.content)
            implementation(libs.ktor.json)
            implementation(libs.coil.compose)
            implementation(libs.coil.ktor)
            implementation(libs.serialization.json)
            implementation(libs.coroutines.core)
        }
        androidMain.dependencies {
            implementation(libs.ktor.okhttp)
            implementation(libs.coroutines.android)
            implementation(libs.activity.compose)
            implementation(libs.browser)
            implementation(libs.exifinterface)
        }
        iosMain.dependencies {
            implementation(libs.ktor.darwin)
        }
    }
}

compose.resources {
    packageOfResClass = "kg.tabyl.res"
    publicResClass = false
}

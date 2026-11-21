plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "kg.tabyl.app"
    compileSdk = 37
    defaultConfig {
        applicationId = "kg.tabyl"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }
    buildFeatures { buildConfig = true }
    buildTypes {
        debug {
            // the emulator reaches the PC's localhost as 10.0.2.2
            buildConfigField("String", "API_URL", "\"http://10.0.2.2:3200\"")
        }
        release {
            buildConfigField("String", "API_URL", "\"https://tabyl.kg\"")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation(projects.shared)
    implementation(libs.activity.compose)
}

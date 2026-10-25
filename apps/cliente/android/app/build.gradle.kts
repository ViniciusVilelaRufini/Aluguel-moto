import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Push (FCM): o plugin do Google so entra quando google-services.json existe (fora do git).
// Sem o arquivo o app compila e roda normalmente, com push desligado.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

// Assinatura de release: android/key.properties (fora do git; formato no README).
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "br.com.volti.volti_cliente"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "br.com.volti.volti_cliente"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = requireNotNull(keystoreProperties.getProperty("keyAlias")) { "key.properties sem keyAlias" }
                keyPassword = requireNotNull(keystoreProperties.getProperty("keyPassword")) { "key.properties sem keyPassword" }
                storeFile = file(requireNotNull(keystoreProperties.getProperty("storeFile")) { "key.properties sem storeFile" })
                storePassword = requireNotNull(keystoreProperties.getProperty("storePassword")) { "key.properties sem storePassword" }
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                // Sem key.properties: chave debug (APK de teste/emulador). Nao publicar assim.
                gradle.taskGraph.whenReady {
                    if (allTasks.any { it.name.contains("Release", ignoreCase = true) }) {
                        logger.warn("WARNING: android/key.properties ausente: release assinado com a chave DEBUG (nao publicavel).")
                    }
                }
                signingConfigs.getByName("debug")
            }
        }
    }
}

flutter {
    source = "../.."
}

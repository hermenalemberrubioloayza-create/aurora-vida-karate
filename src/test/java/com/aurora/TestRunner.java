package com.aurora;

import com.intuit.karate.junit5.Karate;

class TestRunner {

    @Karate.Test
    Karate testAll() {
        // Ejecuta todos los features del paquete
        return Karate.run("cotizaciones/cotizaciones-contrato").relativeTo(getClass());
    }

    @Karate.Test
    Karate testSmoke() {
        // Permite correr solo tags de smoke: mvn test -Dkarate.options="--tags @smoke"
        return Karate.run().tags("@smoke").relativeTo(getClass());
    }
}
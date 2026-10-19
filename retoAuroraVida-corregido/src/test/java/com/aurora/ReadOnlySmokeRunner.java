package com.aurora;

import com.intuit.karate.junit5.Karate;

/**
 * Solo escenarios que no crean ni modifican datos ni usan el soporte de pruebas: apto para PROD.
 */
class ReadOnlySmokeRunner {

    @Karate.Test
    Karate testReadOnlySmoke() {
        return Karate.run("cotizaciones/cotizaciones-smoke-readonly.feature")
                .tags("@readonly")
                .relativeTo(getClass());
    }
}

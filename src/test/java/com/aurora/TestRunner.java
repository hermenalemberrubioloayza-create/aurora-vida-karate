package com.aurora;

import com.intuit.karate.junit5.Karate;

/**
 * Corre todos los features de cotizaciones (los helpers con @ignore se omiten).
 * Requiere el soporte de pruebas (APP_MODE=test): úsalo en local, efimero, dev y certi.
 */
class TestRunner {

    @Karate.Test
    Karate testAll() {
        return Karate.run(
                "cotizaciones/cotizar.feature",
                "cotizaciones/consultar.feature"
        ).relativeTo(getClass());
    }
}

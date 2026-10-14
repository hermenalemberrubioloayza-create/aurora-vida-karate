package com.aurora;

import com.intuit.karate.junit5.Karate;

class ReadOnlySmokeRunner {

    @Karate.Test
    Karate testReadOnlySmoke() {
        return Karate.run("cotizaciones/cotizaciones-smoke-readonly").relativeTo(getClass());
    }
}

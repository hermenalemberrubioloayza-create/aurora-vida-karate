package com.aurora;

import com.intuit.karate.junit5.Karate;

class TestRunner {

    @Karate.Test
    Karate testAll() {
        return Karate.run("cotizaciones/cotizaciones-contrato").relativeTo(getClass());
    }
}
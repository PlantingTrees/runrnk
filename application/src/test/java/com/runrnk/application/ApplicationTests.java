package com.runrnk.application;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import javax.sql.DataSource;

@SpringBootTest
class ApplicationTests {

    @MockitoBean
    DataSource dataSource;

    @Test
    void contextLoads() {
    }
}
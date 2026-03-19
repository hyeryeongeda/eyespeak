package e205.eyespeak.domain.communication.controller;

import e205.eyespeak.global.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/categories")
public class CategoryController {

    @GetMapping("/tree")
    public ApiResponse<?> getTree() {
        return ApiResponse.ok(null);
    }
}

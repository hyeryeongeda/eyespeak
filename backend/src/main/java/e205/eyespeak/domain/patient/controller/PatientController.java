package e205.eyespeak.domain.patient.controller;

import e205.eyespeak.global.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/patients")
public class PatientController {

    @GetMapping("/me")
    public ApiResponse<?> getMe() {
        return ApiResponse.ok(null);
    }
}

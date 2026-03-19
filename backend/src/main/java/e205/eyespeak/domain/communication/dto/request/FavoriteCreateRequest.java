package e205.eyespeak.domain.communication.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class FavoriteCreateRequest {

    @NotNull(message = "표현 ID는 필수입니다")
    private Long phraseId;
}

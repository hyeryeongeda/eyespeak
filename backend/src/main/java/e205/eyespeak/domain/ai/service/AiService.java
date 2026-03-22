package e205.eyespeak.domain.ai.service;

import e205.eyespeak.domain.ai.dto.response.GeneralCorpusResponse;
import e205.eyespeak.domain.recommendation.repository.GeneralCorpusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * AI 서버 전용 내부 API 서비스
 * - AI 서버가 필요한 데이터를 DB에서 조회하여 반환
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AiService {

    private final GeneralCorpusRepository generalCorpusRepository;

    /** 범용 말뭉치 전체 조회 */
    public List<GeneralCorpusResponse> getGeneralCorpus() {
        return generalCorpusRepository.findAll().stream()
                .map(GeneralCorpusResponse::from)
                .toList();
    }
}

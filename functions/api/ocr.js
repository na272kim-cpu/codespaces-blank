export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. 보안 헤더 및 CORS 처리
        const headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        };

        // 2. OPTIONS 사전 요청(Preflight) 처리
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers });
        }

        // 3. 환경 변수에서 OpenAI 및 Gemini API 키 획득 (대소문자 오타나 커스텀 네이밍 적극 대응)
        const openAiApiKey = env.OPENAI_API_KEY || env.openaiApiKey || env.OPENAI_KEY || "";
        const geminiApiKey = env.GEMINI_API_KEY || env.geminiApiKey || env.GEMINI_KEY || env.API_KEY || env.googleGeminiApiKey || "";

        // 두 열쇠 모두 없을 시 로컬 Tesseract 모드용 폴백 신호 반환
        if (!openAiApiKey && !geminiApiKey) {
            return new Response(JSON.stringify({ error: "API_KEY_MISSING", message: "서버에 설정된 API 키가 없습니다. 로컬 OCR 모드로 진행합니다." }), {
                status: 200,
                headers
            });
        }

        // 4. 요청 본문(Payload) 파싱
        const body = await request.json();
        const { base64, mimeType } = body;

        if (!base64 || !mimeType) {
            return new Response(JSON.stringify({ error: "INVALID_REQUEST", message: "필수 이미지 데이터가 누락되었습니다." }), {
                status: 400,
                headers
            });
        }

        // 5. 비즈니스 코어 프롬프트 지시어
        const promptText = `
            역할: 아주 지능적인 명함 스캐너 전문 엔진.
            임무: 첨부된 명함 이미지 속에 기재되어 있는 텍스트 정보를 완벽히 분석해서 정확한 형식의 JSON 정보로 추출하라.
            
            스키마 규격:
            - name: 이름 (만약 없으면 빈 문자열 "")
            - company: 회사명 혹은 로고 이름 (만약 없으면 빈 문자열 "")
            - role: 직급, 직책 또는 소속 부서 (만약 없으면 빈 문자열 "")
            - email: 대표 이메일 주소 (만약 없으면 빈 문자열 "")
            - phone: 첫 번째 연락처 (휴대폰 번호 우선 기입, 휴대폰이 없다면 유선 전화번호 또는 회사 대표 번호 기입, 만약 없으면 빈 문자열 "")
            - phone2: 두 번째 연락처 (명함 내에 전화번호가 2개 이상 기재되어 있는 경우, 첫 번째 기입한 번호 외의 보조 휴대전화, 회사 직통 전화, 또는 팩스 번호 등을 여기에 순차적으로 나누어 기입, 없으면 빈 문자열 "")
            - country: 국가명 (이메일 도메인(예: .uk -> 영국, .hk -> 홍콩, .sg -> 싱가포르 등), 전화 국가코드(예: +44 -> 영국, +852 -> 홍콩, +65 -> 싱가포르), 주소 지명(예: England/London -> 영국, Hong Kong -> 홍콩 등)을 최우선적으로 정밀 유추하여 한글 국가명(예: 대한민국, 영국, 홍콩, 미국, 일본, 중국, 싱가포르 등)으로 기재하며, 도저히 유추 불가시에는 기본값 '알수없음'으로 기재하라.)
            - address: 우편주소 또는 지번 주소 (만약 없으면 빈 문자열 "")
            - website: 웹사이트 주소 또는 SNS 채널 (만약 없으면 빈 문자열 "")
            - notes: 명함에 기재된 기타 비고/참고사항 및 명함 위나 주변에 볼펜/연필 등으로 직접 적은 손글씨 메모가 있다면 이를 최대한 정확하게 판독하여 기재하라.
              손글씨 판독 시 필수 준수 사항:
              1) 절대 "[손글씨]"라는 접두사(prefix)나 임의의 라벨을 기입하지 말고 순수한 메모 내용만 단정하게 기재할 것.
              2) 흘려 쓴 한글 서체는 오독하기 매우 쉬우므로(예: '여자두분'을 자모 획 모양 왜곡으로 인해 '여기부부' 등으로 잘못 해석하는 등), 글자의 물리적인 획 구조를 한국어 어법 및 명함 맥락과 결합하여 이중으로 신중하게 검증하고 자연스러운 단어로 최종 판정할 것.
              3) 손글씨가 없거나 도저히 판독할 수 없는 경우, 영어명, 소셜 링크, 슬로건 등 다른 특이사항을 기재하거나 그것도 없다면 빈 문자열 ""을 반환할 것.
        `;

        // =========================================================================
        // [루트 A] OpenAI API 키가 있을 경우 (최우선 순위 - GPT-4o-mini 비전 가동)
        // =========================================================================
        if (openAiApiKey) {
            const endpointUrl = "https://api.openai.com/v1/chat/completions";
            const openaiPayload = {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: promptText
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64}`
                                }
                            }
                        ]
                    }
                ],
                // Structured Outputs를 명시하여 오차 없는 데이터 반환률 보장 (엄격 스키마)
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "business_card_data",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                company: { type: "string" },
                                role: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                phone2: { type: "string" },
                                country: { type: "string" },
                                address: { type: "string" },
                                website: { type: "string" },
                                notes: { type: "string" }
                            },
                            required: ["name", "company", "role", "email", "phone", "phone2", "country", "address", "website", "notes"],
                            additionalProperties: false
                        }
                    }
                }
            };

            const response = await fetch(endpointUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openAiApiKey}`
                },
                body: JSON.stringify(openaiPayload)
            });

            if (!response.ok) {
                const errText = await response.text();
                return new Response(JSON.stringify({ error: "OPENAI_API_ERROR", message: `OpenAI API 오류 발생: ${response.status}`, details: errText }), {
                    status: response.status,
                    headers
                });
            }

            const data = await response.json();
            const parsedText = data.choices?.[0]?.message?.content;
            if (!parsedText) {
                return new Response(JSON.stringify({ error: "EMPTY_RESPONSE", message: "OpenAI 응답 내부에 반환 텍스트가 부재합니다." }), {
                    status: 500,
                    headers
                });
            }

            // 성공적인 JSON 반환
            return new Response(parsedText, { status: 200, headers });
        }

        // =========================================================================
        // [루트 B] OpenAI 키는 없고 Gemini API 키가 있을 경우 (차선 순위 - Gemini 가동)
        // =========================================================================
        if (geminiApiKey) {
            const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-1.5-flash"];
            const geminiPayload = {
                contents: [{
                    parts: [
                        { text: promptText },
                        { 
                            inlineData: { 
                                mimeType: mimeType, 
                                data: base64 
                            } 
                        }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            name: { type: "STRING" },
                            company: { type: "STRING" },
                            role: { type: "STRING" },
                            email: { type: "STRING" },
                            phone: { type: "STRING" },
                            phone2: { type: "STRING" },
                            country: { type: "STRING" },
                            address: { type: "STRING" },
                            website: { type: "STRING" },
                            notes: { type: "STRING" }
                        },
                        required: ["name", "company", "role", "email", "phone", "phone2", "country", "address", "website", "notes"]
                    }
                }
            };

            let response = null;
            let lastStatus = 0;
            let lastErrorText = "";

            for (const model of models) {
                const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
                try {
                    const res = await fetch(endpointUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(geminiPayload)
                    });

                    if (res.status === 404) {
                        lastStatus = 404;
                        lastErrorText = `모델 ${model} 지원 불가 (404 Not Found)`;
                        continue;
                    }

                    response = res;
                    break;
                } catch (err) {
                    lastStatus = 500;
                    lastErrorText = err.message || "네트워크 에러";
                }
            }

            if (!response) {
                return new Response(JSON.stringify({ 
                    error: "GEMINI_API_ERROR", 
                    message: `Gemini API 호출 전체 실패 (모든 모델 비활성): ${lastStatus}`, 
                    details: lastErrorText 
                }), {
                    status: lastStatus || 500,
                    headers
                });
            }

            if (response.status === 429) {
                return new Response(JSON.stringify({ error: "RATE_LIMITED", message: "API 요청 한도가 일시적으로 초과되었습니다. 로컬 모드로 자동 전환합니다." }), {
                    status: 200,
                    headers
                });
            }

            if (!response.ok) {
                const errText = await response.text();
                return new Response(JSON.stringify({ error: "GEMINI_API_ERROR", message: `Gemini API 오류 발생: ${response.status}`, details: errText }), {
                    status: response.status,
                    headers
                });
            }

            const data = await response.json();
            const parsedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!parsedText) {
                return new Response(JSON.stringify({ error: "EMPTY_RESPONSE", message: "Gemini API 응답 내부에 반환 텍스트가 부재합니다." }), {
                    status: 500,
                    headers
                });
            }

            // 성공적인 JSON 반환
            return new Response(parsedText, { status: 200, headers });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: "INTERNAL_ERROR", message: error.message || "서버 내부 오류가 발생했습니다." }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            }
        });
    }
}
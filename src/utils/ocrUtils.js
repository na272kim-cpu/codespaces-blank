export async function preprocessImageDataUrl(dataUrl, mimeType = 'image/png') {
    if (!dataUrl) return dataUrl;

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;
            const maxDim = 1800;
            const scale = Math.min(1, maxDim / Math.max(width, height));
            const targetWidth = Math.max(1, Math.round(width * scale));
            const targetHeight = Math.max(1, Math.round(height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve(dataUrl);
                return;
            }

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            const pixels = imageData.data;
            for (let i = 0; i < pixels.length; i += 4) {
                const gray = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                const adjusted = Math.max(0, Math.min(255, (gray - 128) * 1.18 + 128 - 12));
                pixels[i] = adjusted;
                pixels[i + 1] = adjusted;
                pixels[i + 2] = adjusted;
            }
            ctx.putImageData(imageData, 0, 0);

            const outputMime = mimeType && mimeType.includes('jpeg') ? 'image/jpeg' : 'image/png';
            const quality = outputMime === 'image/jpeg' ? 0.92 : 0.95;
            resolve(canvas.toDataURL(outputMime, quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

export function extractClientGeminiApiKey() {
    return '';
}

export function parseGeminiResponse(rawText) {
    const text = (rawText || '').toString().trim();
    if (!text) {
        return null;
    }

    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const jsonCandidate = fencedMatch ? fencedMatch[1] : text;

    const cleaned = jsonCandidate
        .replace(/^\s*json\s*/i, '')
        .trim();

    try {
        const parsed = JSON.parse(cleaned);
        return {
            name: parsed.name || '',
            company: parsed.company || '',
            role: parsed.role || '',
            email: parsed.email || '',
            phone: parsed.phone || '',
            phone2: parsed.phone2 || '',
            country: parsed.country || '알수없음',
            address: parsed.address || '',
            website: parsed.website || '',
            notes: parsed.notes || ''
        };
    } catch (error) {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!objectMatch) {
            return null;
        }

        try {
            const parsed = JSON.parse(objectMatch[0]);
            return {
                name: parsed.name || '',
                company: parsed.company || '',
                role: parsed.role || '',
                email: parsed.email || '',
                phone: parsed.phone || '',
                phone2: parsed.phone2 || '',
                country: parsed.country || '알수없음',
                address: parsed.address || '',
                website: parsed.website || '',
                notes: parsed.notes || ''
            };
        } catch (secondError) {
            return null;
        }
    }
}

function normalizeEmail(value) {
    return (value || '').toLowerCase().replace(/\s+/g, '').trim();
}

function normalizePhone(value) {
    const raw = (value || '').trim();
    if (!raw) return '';

    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';

    if (digits.length === 11 && digits.startsWith('010')) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }

    if (digits.length === 10 && digits.startsWith('02')) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }

    if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    if (digits.length === 9) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }

    return digits;
}

function normalizeWebsite(value) {
    const normalized = (value || '').trim();
    if (!normalized) return '';
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (/^www\./i.test(normalized)) return `https://${normalized}`;
    return normalized;
}

function normalizeAddress(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function validateParsedCardData(parsed) {
    const cleaned = { ...parsed };

    const suspiciousNamePatterns = /(iermo|ier|mo|xai|korea|co|ltd|company|address|email|website|instagram|whatsapp|memo|note|official|clinic)/i;
    if (cleaned.name && suspiciousNamePatterns.test(cleaned.name) && cleaned.company) {
        cleaned.name = '';
    }

    if (cleaned.company && /인쇄 정보|수기 메모|메모|회사명|주소|웹사이트|이메일|whatsapp|instagram/i.test(cleaned.company)) {
        cleaned.company = '';
    }

    if (cleaned.role && /(인쇄 정보|수기 메모|메모|회사명|주소|웹사이트|이메일)/i.test(cleaned.role)) {
        cleaned.role = '';
    }

    if (cleaned.email && !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(cleaned.email)) {
        cleaned.email = '';
    }

    if (cleaned.phone && !/^\d{2,4}[-.]?\d{3,4}[-.]?\d{4}$/.test(cleaned.phone.replace(/\D/g, '')) && !/^\+\d{8,15}$/.test(cleaned.phone)) {
        cleaned.phone = '';
    }

    if (cleaned.phone2 && !/^\d{2,4}[-.]?\d{3,4}[-.]?\d{4}$/.test(cleaned.phone2.replace(/\D/g, '')) && !/^\+\d{8,15}$/.test(cleaned.phone2)) {
        cleaned.phone2 = '';
    }

    if (cleaned.website && !/^(https?:\/\/|www\.)/i.test(cleaned.website)) {
        cleaned.website = '';
    }

    if (cleaned.address && cleaned.address.length < 3) {
        cleaned.address = '';
    }

    return cleaned;
}

export function parseOcrTextToCardData(text) {
    const rawText = (text || '').replace(/\r/g, '').trim();
    const lines = rawText
        .split(/\n+/)
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const block = lines.join('\n');

    // 1. 대표 이메일 추출
    const email = block.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';

    // 2. 다중 연락처 추출 (글로벌 괄호형, 국가코드형, 대시형, 공백형 모두 지원하는 범용 정규식)
    // Tesseract의 대표 오독 패턴(0<->O, 1<->l/I)까지 미리 통합 수용
    const rawPhoneMatches = block.match(/(?:\+?[\dOolI]{1,4}[-\s.()]*){2,}[\dOolI]{4}/g) || [];
    const phoneMatches = rawPhoneMatches.map(p => {
        // 오독 글자 자동 복원 및 포맷 정돈
        let cleanedPhone = p.replace(/[O_o]/g, '0')
                            .replace(/[lIi]/g, '1')
                            .trim();
        return cleanedPhone;
    }).filter(p => {
        // 공백 및 기호 제거 후 순수 숫자만 추렸을 때 7자리에서 15자리 사이의 전형적인 전화번호 포맷인지 필터링
        const digitsOnly = p.replace(/[^0-9]/g, '');
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    });
    const phone = phoneMatches[0] || '';
    const phone2 = phoneMatches[1] || '';

    // 3. 웹사이트 추출
    const website = block.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)?.[0] || '';

    // 4. 국가 판별 (우선순위: 선제적 한국 판정 및 국번/국가번호의 정교한 단어 경계 매칭)
    let country = '알수없음';
    const lowerBlock = block.toLowerCase();
    
    // 0순위: 대한민국 (KOREA, 한국, 서울, +82, co.kr 등 한국 지표 감지 시 최우선 선제적 확정)
    if (lowerBlock.includes('korea') || lowerBlock.includes('한국') || lowerBlock.includes('대한민국') || lowerBlock.includes('seoul') || lowerBlock.includes('서울') || lowerBlock.includes('+82') || lowerBlock.includes('co.kr') || lowerBlock.includes('.kr') || lowerBlock.includes('cokr')) {
        country = '대한민국';
    }
    // 1순위: 홍콩 (홍콩 국번 +852, (852) 및 단독 키워드 감지)
    else if (lowerBlock.includes('hong') || lowerBlock.includes('홍콩') || /\bhk\b/.test(lowerBlock) || lowerBlock.includes('+852') || lowerBlock.includes('(852)')) {
        country = '홍콩';
    } 
    // 2순위: 영국 (영국 국번 +44, (44) 및 단독 키워드 감지)
    else if (lowerBlock.includes('united kingdom') || lowerBlock.includes('england') || /\buk\b/.test(lowerBlock) || lowerBlock.includes('london') || lowerBlock.includes('영국') || lowerBlock.includes('잉글랜드') || lowerBlock.includes('+44') || lowerBlock.includes('(44)')) {
        country = '영국';
    } 
    // 3순위: 싱가포르 (싱가포르 국번 +65, (65) 및 단독 키워드 감지)
    else if (lowerBlock.includes('singapore') || lowerBlock.includes('싱가포르') || /\bsg\b/.test(lowerBlock) || lowerBlock.includes('+65') || lowerBlock.includes('(65)')) {
        country = '싱가포르';
    } 
    // 아랍에미리트 (UAE 국번 +971, (971) 및 단독 키워드 감지)
    else if (lowerBlock.includes('united arab emirates') || lowerBlock.includes('uae') || lowerBlock.includes('dubai') || lowerBlock.includes('abudhabi') || lowerBlock.includes('아랍에미리트') || lowerBlock.includes('두바이') || lowerBlock.includes('아부다비') || lowerBlock.includes('+971') || lowerBlock.includes('(971)')) {
        country = '아랍에미리트';
    }
    // 기타 주요 아시아 거점
    else if (lowerBlock.includes('japan') || lowerBlock.includes('일본') || lowerBlock.includes('tokyo') || lowerBlock.includes('東京')) {
        country = '일본';
    } else if (lowerBlock.includes('china') || lowerBlock.includes('중국') || lowerBlock.includes('beijing') || lowerBlock.includes('北京')) {
        country = '중국';
    } else if (lowerBlock.includes('taiwan') || lowerBlock.includes('대만') || lowerBlock.includes('taipei') || lowerBlock.includes('台灣')) {
        country = '대만';
    } else if (lowerBlock.includes('vietnam') || lowerBlock.includes('베트남') || lowerBlock.includes('hanoi') || lowerBlock.includes('ho chi minh')) {
        country = '베트남';
    } 
    // 서구권 거점
    else if (lowerBlock.includes('germany') || lowerBlock.includes('독일') || lowerBlock.includes('berlin') || lowerBlock.includes('deutschland')) {
        country = '독일';
    } else if (lowerBlock.includes('france') || lowerBlock.includes('프랑스') || lowerBlock.includes('paris')) {
        country = '프랑스';
    } else if (lowerBlock.includes('canada') || lowerBlock.includes('캐나다') || lowerBlock.includes('toronto') || lowerBlock.includes('vancouver')) {
        country = '캐나다';
    } else if (lowerBlock.includes('australia') || lowerBlock.includes('호주') || lowerBlock.includes('sydney')) {
        country = '호주';
    } 
    // 미국 감지 (LAU -> USA 오독 충돌 방지를 위해 단어 경계 \b 매칭 적용)
    else if (/\b(usa|america|united states)\b/i.test(lowerBlock) || lowerBlock.includes('미국')) {
        country = '미국';
    }

    // 5. 각 라인에서 이미 추출된 이메일, 전화번호, 웹사이트를 지워서 오독을 원천 차단 (Subtractive Cleaning)
    const companyPatterns = /(회사|주식회사|㈜|컴퍼니|솔루션|서비스|시스템|스튜디오|네트워크|테크|테크놀로지|미디어|파이낸스|컨설팅|파트너스|bank|finance|consulting|partners|group|labs|lab|software|soft|systems|solutions|technology|tech|studio|media|service|services|corp|ltd|llc|co\.|cosmetics|korea)/i;
    const rolePatterns = /(대표|대표이사|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|직책|담당|개발자|엔지니어|기획자|디자이너|마케터|운영|관리|총괄|주임|개발팀장|본부장)/i;
    const addressPatterns = /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|해외|[가-힣]+(?:시|도|구|군|로|길|읍|면|동))|주소|우편|번지|\b(street|road|st|rd|ave|avenue|blvd|highway|way|lane|drive|dr|court|ct|plaza|place|pl|square|sq|building|bldg|floor|fl|suite|ste|room|rm|block|blk|district|county|city|state|zip|postal|zone|seoul|incheon|busan|daegu|daejeon|gwangju|ulsan|korea|ro|gu|daero|dong|gil)\b/i;
    const koreanNamePattern = /^[가-힣]{2,5}$/;
    const englishNamePattern = /^[A-Za-z][A-Za-z\s.'-]{1,25}$/;
    const shortNamePattern = /^[가-힣]{2,4}$/;

    let company = '';
    let role = '';
    let address = '';
    let name = '';

    const cleanedLines = lines.map(line => {
        let cleaned = line;
        // 이메일 제거
        if (email) cleaned = cleaned.replace(email, '');
        // 연락처 제거
        phoneMatches.forEach(p => {
            cleaned = cleaned.replace(p, '');
        });
        // 웹사이트 제거
        if (website) cleaned = cleaned.replace(website, '');
        
        // 특수문자 정돈
        return cleaned.replace(/^[•·\-\s:,]+|[•·\-\s:,]+$/g, '').trim();
    }).filter(Boolean);

    // 6. 주소 추출 (가장 긴 라인 위주 혹은 패턴 매칭)
    for (const line of cleanedLines) {
        if (addressPatterns.test(line) && !companyPatterns.test(line) && !rolePatterns.test(line)) {
            // 이름으로 잘못 인식되지 않는 주소 필터
            const trimmedLine = line.replace(/[•·\-\s]+/g, '');
            if (!koreanNamePattern.test(trimmedLine) && trimmedLine.length > 5) {
                address = line;
                break;
            }
        }
    }

    // 7. 직급(role) 추출 - 라인에서 직급 단어만 추출하여 깔끔하게 분리
    for (const line of cleanedLines) {
        const roleMatch = line.match(rolePatterns);
        if (roleMatch) {
            role = roleMatch[0]; // 전체 라인이 아니라 오직 직급 단어('대표' 등)만 추출!
            break;
        }
    }

    // 8. 회사명(company) 추출
    const companyCandidates = cleanedLines.filter((line) => {
        const trimmed = line.replace(/[•·\-\s]+/g, '').trim();
        if (!trimmed || trimmed.length < 2) return false;
        if (/인쇄 정보|수기 메모|메모|회사명|주소|웹사이트|이메일|whatsapp|instagram|official|clinic/i.test(trimmed)) return false;
        if (addressPatterns.test(line)) return false;
        return companyPatterns.test(line);
    });

    if (companyCandidates.length > 0) {
        const preferred = companyCandidates.find((line) => /회사|주식회사|㈜|corp|ltd|llc|co\.|cosmetics/i.test(line)) || companyCandidates[0];
        company = preferred.replace(/[•·\-\s]+/g, '').trim();
    }

    // 9. 이름(name) 추출 - 라인 단위로 우선순위 판단
    const nameCandidates = [];
    for (const line of cleanedLines) {
        const cleanLine = line.replace(/[•·\-\s]+/g, '').trim();
        if (!cleanLine) continue;
        if (/인쇄 정보|수기 메모|메모|회사명|주소|웹사이트|이메일|whatsapp|instagram|official|clinic/i.test(cleanLine)) continue;

        let nameCandidate = cleanLine;
        const roleMatch = line.match(rolePatterns);
        if (roleMatch) {
            nameCandidate = cleanLine.replace(roleMatch[0], '').trim();
        }

        if (shortNamePattern.test(nameCandidate) || englishNamePattern.test(nameCandidate)) {
            nameCandidates.push(nameCandidate);
        }
    }

    if (nameCandidates.length > 0) {
        name = nameCandidates.find((candidate) => candidate.length >= 2 && candidate.length <= 5) || nameCandidates[0];
    }

    // 10. 만약 이름을 여전히 못 찾았다면, ignorePatterns가 없고 짧은 라인을 차선책으로 선택
    if (!name) {
        const ignorePatterns = /회사|주식회사|지점|본사|㈜|컴퍼니|솔루션|대표|이사|부장|차장|과장|대리|팀장|@|http|www|전화|주소|tel|mobile/i;
        const fallback = cleanedLines.find(line => !ignorePatterns.test(line) && line.length <= 15) || '';
        name = fallback.replace(/[•·\-\s]+/g, '').trim();
    }

    const normalized = {
        name: name.replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        company: company.replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        role: role.replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        phone2: normalizePhone(phone2),
        country,
        address: normalizeAddress(address.replace(/^[•·\-\s]+|[•·\-\s]+$/g, '')),
        website: normalizeWebsite(website),
        notes: ''
    };

    return refineParsedCardData(normalized, lines, block);
}

export function refineParsedCardData(parsed, lines, block) {
    const cleaned = { ...parsed };
    const text = `${lines.join(' ')} ${block}`.toLowerCase();

    if (!cleaned.company && /회사|주식회사|㈜|corp|co\.|ltd|llc|inc|solutions|tech|technology|software|systems|studio|media|consulting|partners|cosmetics/.test(block)) {
        const companyMatch = block.match(/([가-힣A-Za-z0-9.&()\- ]{2,40})(?:\n|\s)(대표|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|담당|개발자|엔지니어|기획자|디자이너|마케터|주임)/);
        if (companyMatch) {
            cleaned.company = companyMatch[1].trim();
        }
    }

    if (!cleaned.name) {
        const nameCandidates = lines.filter(line => {
            const trimmed = line.replace(/[•·\-\s]+/g, '');
            return /^[가-힣]{2,5}$/.test(trimmed) || /^[A-Za-z][A-Za-z\s.'-]{1,25}$/.test(trimmed);
        });
        cleaned.name = nameCandidates[0] || '';
    }

    if (!cleaned.role) {
        const roleLine = lines.find(line => /(대표|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|담당|개발자|엔지니어|기획자|디자이너|마케터|주임)/i.test(line));
        if (roleLine) {
            const roleMatch = roleLine.match(/(대표|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|담당|개발자|엔지니어|기획자|디자이너|마케터|주임)/i);
            if (roleMatch) {
                cleaned.role = roleMatch[1];
            }
        }
    }

    if (!cleaned.role) {
        const roleMatch = block.match(/(대표|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|담당|개발자|엔지니어|기획자|디자이너|마케터|주임|개발팀장|팀장)/);
        if (roleMatch) {
            cleaned.role = roleMatch[1];
        }
    }

    if (!cleaned.address && /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|street|road|st|rd|ave|building|bldg|floor|fl|suite|block|postal|zip|seoul|incheon|busan|korea|ro|gu|daero|dong|gil/i.test(block)) {
        const addrMatch = block.match(/([A-Za-z0-9\s\-.,#]+(?:street|road|st|rd|ave|building|bldg|floor|fl|suite|block|postal|zip|city|state|country|district|seoul|incheon|busan|korea|ro|gu|daero|dong|gil))/i) ||
                          block.match(/([가-힣0-9\s\-.,]+(?:시|도|구|군|로|길|동|읍|면|번지))/);
        if (addrMatch) {
            cleaned.address = addrMatch[1].trim();
        }
    }

    // 연락처 및 보조 연락처 정밀 추출 (글로벌 규격 수용형)
    const rawMatchedPhones = block.match(/(?:\+?[\dOolI]{1,4}[-\s.()]*){2,}[\dOolI]{4}/g) || [];
    const matchedPhones = rawMatchedPhones.map(p => {
        return p.replace(/[O_o]/g, '0')
                .replace(/[lIi]/g, '1')
                .trim();
    }).filter(p => {
        const digitsOnly = p.replace(/[^0-9]/g, '');
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
    });

    if (matchedPhones.length > 0) {
        if (!cleaned.phone) {
            cleaned.phone = matchedPhones[0];
            if (!cleaned.phone2 && matchedPhones.length > 1) {
                cleaned.phone2 = matchedPhones[1];
            }
        } else if (!cleaned.phone2) {
            const uniquePhones = matchedPhones.filter(num => num !== cleaned.phone);
            if (uniquePhones.length > 0) {
                cleaned.phone2 = uniquePhones[0];
            }
        }
    }

    if (!cleaned.website && /https?:\/\/|www\./.test(text)) {
        const websiteMatch = block.match(/https?:\/\/[^\s]+|www\.[^\s]+/i);
        if (websiteMatch) {
            cleaned.website = websiteMatch[0];
        }
    }

    const validated = validateParsedCardData({
        name: (cleaned.name || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        company: (cleaned.company || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        role: (cleaned.role || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        email: normalizeEmail(cleaned.email || ''),
        phone: normalizePhone(cleaned.phone || ''),
        phone2: normalizePhone(cleaned.phone2 || ''),
        country: cleaned.country || '알수없음',
        address: normalizeAddress((cleaned.address || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, '')),
        website: normalizeWebsite(cleaned.website || ''),
        notes: cleaned.notes || ''
    });

    return validated;
}
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

    // 4. 국가 판별 (우선순위: 국번/국가번호 감지 및 정교한 단어 경계 매칭)
    let country = '알수없음';
    const lowerBlock = block.toLowerCase();
    
    // 1순위: 홍콩 (홍콩 국번 852 및 키워드 감지)
    if (lowerBlock.includes('hong') || lowerBlock.includes('홍콩') || lowerBlock.includes('hk') || lowerBlock.includes('852')) {
        country = '홍콩';
    } 
    // 2순위: 영국 (영국 국번 44 및 키워드 감지)
    else if (lowerBlock.includes('united kingdom') || lowerBlock.includes('england') || lowerBlock.includes('uk') || lowerBlock.includes('london') || lowerBlock.includes('영국') || lowerBlock.includes('잉글랜드') || lowerBlock.includes('44')) {
        country = '영국';
    } 
    // 3순위: 싱가포르 (싱가포르 국번 65 및 키워드 감지)
    else if (lowerBlock.includes('singapore') || lowerBlock.includes('싱가포르') || lowerBlock.includes('sg') || lowerBlock.includes('65')) {
        country = '싱가포르';
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
    const companyPatterns = /(회사|주식회사|㈜|컴퍼니|솔루션|서비스|시스템|스튜디오|네트워크|테크|테크놀로지|미디어|파이낸스|컨설팅|파트너스|bank|finance|consulting|partners|group|labs|lab|software|soft|systems|solutions|technology|tech|studio|media|service|services|corp|ltd|llc|co\.)/i;
    const rolePatterns = /(대표|대표이사|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|직책|담당|개발자|엔지니어|기획자|디자이너|마케터|운영|관리|총괄|주임|개발팀장|본부장)/i;
    const addressPatterns = /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|해외|[가-힣]+(?:시|도|구|군|로|길|읍|면|동))|주소|우편|번지/i;
    const koreanNamePattern = /^[가-힣]{2,5}$/;
    const englishNamePattern = /^[A-Za-z][A-Za-z\s.'-]{1,25}$/;

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
    for (const line of cleanedLines) {
        if (companyPatterns.test(line) && !addressPatterns.test(line)) {
            company = line;
            break;
        }
    }

    // 9. 이름(name) 추출 - 이제 남은 정제된 라인들 중에서 가장 이름다운 2~5글자의 한글 혹은 적절한 영어를 선택!
    for (const line of cleanedLines) {
        const cleanLine = line.replace(/[•·\-\s]+/g, '').trim();
        
        // 직급 단어가 포함되어 있다면 제거한 나머지를 이름 후보로 검사 (예: '이명현 대표' -> '이명현')
        let nameCandidate = cleanLine;
        const roleMatch = line.match(rolePatterns);
        if (roleMatch) {
            nameCandidate = cleanLine.replace(roleMatch[0], '').trim();
        }

        if (koreanNamePattern.test(nameCandidate) || englishNamePattern.test(nameCandidate)) {
            name = nameCandidate;
            break;
        }
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
        email,
        phone,
        phone2,
        country,
        address: address.replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        website,
        notes: ''
    };

    return refineParsedCardData(normalized, lines, block);
}

export function refineParsedCardData(parsed, lines, block) {
    const cleaned = { ...parsed };
    const text = `${lines.join(' ')} ${block}`.toLowerCase();

    if (!cleaned.company && /회사|주식회사|㈜|corp|co\.|ltd|llc|inc|solutions|tech|technology|software|systems|studio|media|consulting|partners/.test(block)) {
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
        const roleMatch = block.match(/(대표|이사|부장|차장|과장|대리|사원|매니저|팀장|센터장|실장|연구원|교수|선생님|담당|개발자|엔지니어|기획자|디자이너|마케터|주임|개발팀장|팀장)/);
        if (roleMatch) {
            cleaned.role = roleMatch[1];
        }
    }

    if (!cleaned.address && /서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주/.test(block)) {
        const addrMatch = block.match(/([가-힣0-9\s\-.,]+(?:시|도|구|군|로|길|동|읍|면|번지))/);
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

    return {
        name: (cleaned.name || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        company: (cleaned.company || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        role: (cleaned.role || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        email: cleaned.email || '',
        phone: cleaned.phone || '',
        phone2: cleaned.phone2 || '',
        country: cleaned.country || '알수없음',
        address: (cleaned.address || '').replace(/^[•·\-\s]+|[•·\-\s]+$/g, ''),
        website: cleaned.website || '',
        notes: cleaned.notes || ''
    };
}
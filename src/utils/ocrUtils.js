export function parseOcrTextToCardData(text) {
    const rawText = (text || '').replace(/\r/g, '').trim();
    const lines = rawText
        .split(/\n+/)
        .map(line => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const block = lines.join('\n');

    // 1. 대표 이메일 추출
    const email = block.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';

    // 2. 다중 연락처 추출 (Tesseract의 숫자 오독(0<->O, 1<->l/I) 자동 복원 및 완화정규식 탑재)
    const rawPhoneMatches = block.match(/(?:\+?[0OolI1i]{1,3}[-\s. ]?)?(?:[0OolI1i]{2,4})[-\s. ]?[0OolI1i\d]{3,4}[-\s. ]?[0OolI1i\d]{4}/g) || [];
    const phoneMatches = rawPhoneMatches.map(p => {
        // 오독된 글자(O, o -> 0 / l, I, i -> 1)를 숫자로 자동 복원 정제
        return p.replace(/[O_o]/g, '0')
                .replace(/[lIi]/g, '1')
                .replace(/[^0-9+\-\s.()]/g, '')
                .trim();
    }).filter(p => {
        // 보정된 국번 유효성 기본 검증 (0, 1, + 등으로 유효하게 시작하는 연락처 포맷 필터링)
        return p.startsWith('0') || p.startsWith('+') || p.startsWith('1');
    });
    const phone = phoneMatches[0] || '';
    const phone2 = phoneMatches[1] || '';

    // 3. 웹사이트 추출
    const website = block.match(/https?:\/\/[^\s]+|www\.[^\s]+/i)?.[0] || '';

    // 4. 국가 판별
    let country = '알수없음';
    const lowerBlock = block.toLowerCase();
    if (lowerBlock.includes('japan') || lowerBlock.includes('일본') || lowerBlock.includes('tokyo') || lowerBlock.includes('東京')) {
        country = '일본';
    } else if (lowerBlock.includes('hong') || lowerBlock.includes('홍콩') || lowerBlock.includes('hk')) {
        country = '홍콩';
    } else if (lowerBlock.includes('china') || lowerBlock.includes('중국') || lowerBlock.includes('beijing') || lowerBlock.includes('北京')) {
        country = '중국';
    } else if (lowerBlock.includes('united kingdom') || lowerBlock.includes('england') || lowerBlock.includes('uk') || lowerBlock.includes('london') || lowerBlock.includes('영국') || lowerBlock.includes('잉글랜드') || lowerBlock.includes('london')) {
        country = '영국';
    } else if (lowerBlock.includes('singapore') || lowerBlock.includes('싱가포르') || lowerBlock.includes('sg')) {
        country = '싱가포르';
    } else if (lowerBlock.includes('germany') || lowerBlock.includes('독일') || lowerBlock.includes('berlin') || lowerBlock.includes('deutschland')) {
        country = '독일';
    } else if (lowerBlock.includes('france') || lowerBlock.includes('프랑스') || lowerBlock.includes('paris')) {
        country = '프랑스';
    } else if (lowerBlock.includes('canada') || lowerBlock.includes('캐나다') || lowerBlock.includes('toronto') || lowerBlock.includes('vancouver')) {
        country = '캐나다';
    } else if (lowerBlock.includes('australia') || lowerBlock.includes('호주') || lowerBlock.includes('sydney')) {
        country = '호주';
    } else if (lowerBlock.includes('taiwan') || lowerBlock.includes('대만') || lowerBlock.includes('taipei') || lowerBlock.includes('台灣')) {
        country = '대만';
    } else if (lowerBlock.includes('vietnam') || lowerBlock.includes('베트남') || lowerBlock.includes('hanoi') || lowerBlock.includes('ho chi minh')) {
        country = '베트남';
    } else if (lowerBlock.includes('usa') || lowerBlock.includes('america') || lowerBlock.includes('united states') || lowerBlock.includes('미국')) {
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

    // 연락처 및 보조 연락처 정밀 추출 (순차적 배치)
    const matchedPhones = block.match(/(?:\+82[-\s]?)?(?:01[016789]|02|0[3-9]{1,2}[1-5])[-\s]?\d{3,4}[-\s]?\d{4}/g) || [];
    if (matchedPhones.length > 0) {
        if (!cleaned.phone) {
            cleaned.phone = matchedPhones[0];
            if (!cleaned.phone2 && matchedPhones.length > 1) {
                cleaned.phone2 = matchedPhones[1];
            }
        } else if (!cleaned.phone2) {
            // 첫 번째 연락처가 이미 파싱되어 있고 다르고 새로운 연락처가 있다면 연락처2에 기입
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
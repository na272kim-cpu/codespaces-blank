import React, { useState } from 'react';
import ExcelJS from 'exceljs';

export default function DataTable({
  sheetData,
  onUpdateCell,
  onAddEmptyRow,
  onClearAllRows,
  onDeleteRow,
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeZoomImage, setActiveZoomImage] = useState(null);

  // 실시간 검색 필터링
  const filteredData = sheetData.filter((row) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (row.name || '').toLowerCase().includes(q) ||
      (row.company || '').toLowerCase().includes(q) ||
      (row.role || '').toLowerCase().includes(q) ||
      (row.email || '').toLowerCase().includes(q) ||
      (row.phone || '').toLowerCase().includes(q) ||
      (row.phone2 || '').toLowerCase().includes(q) ||
      (row.country || '').toLowerCase().includes(q) ||
      (row.address || '').toLowerCase().includes(q) ||
      (row.website || '').toLowerCase().includes(q) ||
      (row.notes || '').toLowerCase().includes(q)
    );
  });

  // Excel 파일 내보내기 (ExcelJS 기반 - 실제 이미지 시트 내장 방식)
  const handleExportExcel = async () => {
    if (sheetData.length === 0) {
      showToast('내보낼 데이터가 비어 있습니다.', 'error');
      return;
    }

    try {
      showToast('명함 이미지를 내장한 정식 엑셀 파일(.xlsx)을 작성 중입니다...', 'info');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('명함 데이터 목록');

      // 컬럼 구조화
      worksheet.columns = [
        { header: '이름', key: 'name', width: 14 },
        { header: '회사명', key: 'company', width: 20 },
        { header: '직급 / 부서', key: 'role', width: 18 },
        { header: '이메일', key: 'email', width: 22 },
        { header: '연락처1', key: 'phone', width: 16 },
        { header: '연락처2', key: 'phone2', width: 16 },
        { header: '국가', key: 'country', width: 10 },
        { header: '주소', key: 'address', width: 30 },
        { header: '웹사이트', key: 'website', width: 20 },
        { header: '비고', key: 'notes', width: 24 },
        { header: '이미지', key: 'image', width: 18 }
      ];

      // 헤더 스타일링
      const headerRow = worksheet.getRow(1);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // 데이터 행 주입 및 셀 스타일링
      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i];
        const addedRow = worksheet.addRow({
          name: row.name,
          company: row.company,
          role: row.role,
          email: row.email,
          phone: row.phone,
          phone2: row.phone2,
          country: row.country,
          address: row.address,
          website: row.website,
          notes: row.notes,
          image: row.imageUrl ? '' : '[이미지 없음]'
        });

        addedRow.height = 56;
        addedRow.eachCell((cell, colNumber) => {
          cell.font = { size: 9 };
          cell.alignment = {
            vertical: 'middle',
            horizontal: (colNumber === 7 || colNumber === 11) ? 'center' : 'left'
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });

        // 엑셀 내 이미지 실제 첨부화 로직
        if (row.imageUrl) {
          try {
            const mimeTypeMatch = row.imageUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';
            const ext = mimeType.split('/')[1] || 'png';
            const base64Data = row.imageUrl.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '');

            const imageId = workbook.addImage({
              base64: base64Data,
              extension: ext
            });

            worksheet.addImage(imageId, {
              tl: { col: 10, row: i + 1 }, // K열 (index 10)
              ext: { width: 110, height: 68 },
              editAs: 'oneCell'
            });
          } catch (imgError) {
            console.error('ExcelJS Image Insertion Failed: ', imgError);
            addedRow.getCell(11).value = '[이미지 삽입 실패]';
          }
        }
      }

      // 다운로드 진행
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Business_Cards_Data_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('명함 이미지가 온전히 내장된 엑셀 파일(.xlsx)이 다운로드되었습니다.');
    } catch (error) {
      console.error('Excel Export Error: ', error);
      showToast('엑셀 생성 오류: ' + error.message, 'error');
    }
  };

  // CSV 내보내기 (UTF-8 BOM 추가)
  const handleExportCsv = () => {
    if (sheetData.length === 0) {
      showToast('내보낼 데이터가 비어 있습니다.', 'error');
      return;
    }

    const headers = ['이름', '회사명', '직급_부서', '이메일', '연락처1', '연락처2', '국가', '주소', '웹사이트', '비고', '이미지'];
    const rows = sheetData.map((row) => [
      row.name,
      row.company,
      row.role,
      row.email,
      row.phone,
      row.phone2,
      row.country,
      row.address,
      row.website,
      row.notes,
      row.imageUrl ? '[명함 이미지 있음]' : '[이미지 없음]'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach((rowFields) => {
      const cleanRow = rowFields.map((val) => {
        let fieldStr = val === null ? '' : String(val);
        fieldStr = fieldStr.replace(/"/g, '""');
        if (fieldStr.search(/([",\n])/g) >= 0) {
          fieldStr = `"${fieldStr}"`;
        }
        return fieldStr;
      });
      csvContent += cleanRow.join(',') + '\n';
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Business_Cards_Data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('스마트 명함 데이터 시트가 CSV 파일로 저장되었습니다.');
  };

  const handleBlur = (rowId, field, e) => {
    const text = e.target.innerText.trim();
    onUpdateCell(rowId, field, text);
  };

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col min-h-[580px]">
      
      {/* 상단 컨트롤 영역 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 mb-5">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <i className="fa-solid fa-table text-primary-500"></i> 스마트 명함 시트 데이터
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            표 안의 텍스트를 클릭하면 바로 수정할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 실시간 필터 인풋 */}
          <div className="relative w-full sm:w-60">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="표 내용 실시간 검색..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl text-xs font-semibold focus:outline-none transition-all"
            />
          </div>

          <button
            onClick={onAddEmptyRow}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="수동 작성 행 추가"
          >
            <i className="fa-solid fa-plus text-primary-500"></i> 행 추가
          </button>
        </div>
      </div>

      {/* 액션 다운로드 툴바 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="text-xs text-slate-400 font-semibold">
          전체 등록 데이터 : <span className="text-primary-600 font-bold">{sheetData.length}</span>행
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/10"
            title="이미지 일체형 정식 엑셀 다운로드"
          >
            <i className="fa-solid fa-file-excel"></i> 엑셀로 내보내기
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-700 hover:bg-slate-800 text-slate-100 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-slate-700/10"
            title="UTF-8 범용 CSV 다운로드"
          >
            <i className="fa-solid fa-file-csv"></i> CSV 저장
          </button>
          <button
            onClick={onClearAllRows}
            disabled={sheetData.length === 0}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
            title="스프레드시트 행 전체 삭제"
          >
            <i className="fa-solid fa-trash-arrow-up"></i> 시트 초기화
          </button>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="flex-grow overflow-x-auto border border-slate-150 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/40 custom-scrollbar">
        <table className="w-full border-collapse text-left text-xs min-w-[1200px]">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/80 border-b border-slate-150 dark:border-slate-800 text-slate-400 select-none">
              <th className="p-3 text-center font-bold w-12">번호</th>
              <th className="p-3 font-bold w-28">이름</th>
              <th className="p-3 font-bold w-36">회사명</th>
              <th className="p-3 font-bold w-32">직급 / 부서</th>
              <th className="p-3 font-bold w-44">이메일</th>
              <th className="p-3 font-bold w-36">연락처1</th>
              <th className="p-3 font-bold w-36">연락처2</th>
              <th className="p-3 font-bold text-center w-20">국가</th>
              <th className="p-3 font-bold w-48">주소</th>
              <th className="p-3 font-bold w-36">웹사이트</th>
              <th className="p-3 font-bold w-40">비고</th>
              <th className="p-3 font-bold text-center w-20">명함 원본</th>
              <th className="p-3 font-bold text-center w-12">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="13" className="p-16 text-center text-slate-400">
                  <i className="fa-solid fa-table-list text-3xl mb-3 block text-slate-300"></i>
                  {searchQuery ? '검색 필터와 일치하는 명함 데이터가 존재하지 않습니다.' : '데이터 행이 비어 있습니다.'}
                </td>
              </tr>
            ) : (
              filteredData.map((row, index) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="p-3 text-center text-slate-400 font-bold select-none bg-slate-50/50 dark:bg-slate-900/10">
                    {index + 1}
                  </td>
                  <td
                    className="p-3 font-semibold text-slate-800 dark:text-slate-100 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'name', e)}
                  >
                    {row.name}
                  </td>
                  <td
                    className="p-3 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'company', e)}
                  >
                    {row.company}
                  </td>
                  <td
                    className="p-3 text-slate-500 dark:text-slate-400 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'role', e)}
                  >
                    {row.role}
                  </td>
                  <td
                    className="p-3 font-mono text-slate-600 dark:text-slate-300 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'email', e)}
                  >
                    {row.email}
                  </td>
                  <td
                    className="p-3 font-mono text-slate-600 dark:text-slate-300 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'phone', e)}
                  >
                    {row.phone}
                  </td>
                  <td
                    className="p-3 font-mono text-slate-600 dark:text-slate-300 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'phone2', e)}
                  >
                    {row.phone2}
                  </td>
                  <td
                    className="p-3 text-center font-bold outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'country', e)}
                  >
                    {row.country}
                  </td>
                  <td
                    className="p-3 text-slate-500 dark:text-slate-400 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'address', e)}
                  >
                    {row.address}
                  </td>
                  <td
                    className="p-3 text-primary-500 font-mono outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'website', e)}
                  >
                    {row.website}
                  </td>
                  <td
                    className="p-3 text-slate-500 dark:text-slate-400 outline-none"
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => handleBlur(row.id, 'notes', e)}
                  >
                    {row.notes}
                  </td>
                  <td className="p-3 text-center">
                    {row.imageUrl ? (
                      <div className="inline-block relative">
                        <img
                          src={row.imageUrl}
                          alt="명함 이미지"
                          onClick={() => setActiveZoomImage(row.imageUrl)}
                          className="h-10 w-16 object-cover rounded border border-slate-200 dark:border-slate-700 cursor-zoom-in hover:scale-105 active:scale-95 transition-all shadow-sm"
                          title="명함 크게 보기"
                        />
                      </div>
                    ) : (
                      <i className="fa-regular fa-image text-slate-300 dark:text-slate-600 text-lg" title="이미지 없음"></i>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                      title="행 삭제"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 이미지 크게 보기 모달 */}
      {activeZoomImage && (
        <div
          id="imageModal"
          onClick={() => setActiveZoomImage(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-800/40 animate-in fade-in zoom-in duration-200">
            <img
              src={activeZoomImage}
              alt="명함 확대 이미지"
              className="max-w-full max-h-[85vh] object-contain select-none"
            />
            <button
              onClick={() => setActiveZoomImage(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
              title="닫기"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
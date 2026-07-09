export const getActiveApiUrl = () => {
  // 取得今天的日期 (1 ~ 31)
  const today = new Date().getDate();

  // 1號 ~ 15號使用第一個 API
  if (today <= 15) {
    return 'https://meowtube-api-lawxstudent168.onrender.com';
  } 
  // 16號 ~ 月底使用第二個 API
  else {
    return 'https://meowtube-api-10n0.onrender.com';
  }
};

export const getActiveApiUrl = () => {
  // 取得今天的日期 (1 ~ 31)
  const today = new Date().getDate();

  // 1號 ~ 10號使用第一個 API
  if (today <= 10) {
    return 'https://meowtube-api-lawxstudent168.onrender.com';
  } 

  else if (today <= 20) {
    return 'https://meowtube-api-f0oz.onrender.com';
  } 
    https://meowtube-api-f0oz.onrender.com
  // 16號 ~ 月底使用第二個 API
  else {
    return 'https://meowtube-api-10n0.onrender.com';
  }
};

function main() {
  const sid = login()
  const clients = get_clients(sid)

  const income_type_id = 4 // Fridays
  const sheet_name = 'iCount problem'
  const cell = 'aa1'
  const docnum = get_docnum(sheet_name, cell)

  const docs = search_docs(sid, income_type_id, docnum)
  update_sheet(sheet_name, docs, clients)
}

function update_sheet(sheet_name, docs, clients) {
  var rows = [],
      data;

  for (i = 0; i < docs.length; i++) {
    data = docs[i];
    const client_id = data.client_id
    const client = clients[client_id]
    rows.push([data.dateissued, data.client_id, data.client_name, data.client_email, client.mobile, data.docnum, data.total]);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = spreadsheet.getSheetByName(sheet_name)
  const lastRow = sheet.getLastRow();
  console.log("last row: %d", lastRow)
  const dataRange = sheet.getRange(lastRow+1, 1, rows.length, 7);
  try {
    dataRange.setValues(rows);
  } catch (f) {
    throw new Error('failed to update spreadsheet with: '+ f.message)
  }
}

function get_docnum(sheet_name, cell) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  console.log('getting docnum from spreadsheet %s, sheet %s, cell %s', spreadsheet.getName(), sheet_name, cell);
  
  const docnum = spreadsheet.getSheetByName(sheet_name).getRange(cell).getValue()
  if (!isInt(docnum)) {
    throw new Error('invalid docnum: '+docnum)
  }
  console.log('got docnum %d', docnum);
  return docnum
}

function get_clients(sid) {
  var url = 'https://api.icount.co.il/api/v3.php/client/get_list'

  var body = {
    'sid': sid,
    'detail_level': 3
  };

  var options = get_post_options(body)

  const response = send(url, options)
  if (!response.status) {
    throw new Error('get clients failed with '+response.reason)
  }

  return response.clients
}

function search_docs(sid, income_type_id, docnum) {
  var url = 'https://api.icount.co.il/api/v3.php/doc/search'
  const row_limit = 100

  var body = {
    'sid': sid,
    'income_type_id': income_type_id,
    'limit': row_limit,
    'docnum': get_docnum_filter(docnum, row_limit),
    'detail_level': 9
  };

  var options = get_post_options(body)

  const response = send(url, options)
  if (!response.status) {
    throw new Error('search docs failed with '+response.reason)
  }

  return response.results_list
}

function get_docnum_filter(start, length) {
  result = start
  for (let step = start+1; step < start+length; step++) {
    result = result + "," + step
  }
  return result
}

function login() {
  var url = 'https://api.icount.co.il/api/v3.php/auth/login'

  var body = {
    'cid': get_secret("cid"),
    'user': get_secret('user'),
    'pass': get_secret('password')
  };

  var options = get_post_options(body)

  const response = send(url, options)
  if (!response.status) {
    throw new Error('login failed with '+response.reason)
  }
  return(response.sid);
}

function send(url, options) {
  console.log('calling %s', url)
  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    return data
  } catch (f) {
    throw new Error('API call to '+url+' failed with '+ f.message)
  }
}

function get_secret(name) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const data = scriptProperties.getProperties();
    return data[name];
  } catch (err) {
    throw new Error('Failed to get '+name+' with '+ err.message);
  }
}

function isInt(value) {
  return !isNaN(value) && 
         parseInt(Number(value)) == value && 
         !isNaN(parseInt(value, 10));
}

function get_post_options(body) {
  return {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(body)
  };
}

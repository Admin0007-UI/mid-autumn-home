const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=Number(process.env.PORT||5188);
const mime={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain;charset=utf-8','.md':'text/plain;charset=utf-8'};
http.createServer((req,res)=>{
  let file;
  try {const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404).end('Not found');return}}
  catch {res.writeHead(400).end();return}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(file).pipe(res);
}).listen(port,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+port));

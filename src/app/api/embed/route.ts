import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const slug = searchParams.get('slug');
  const type = searchParams.get('type') || 'inline'; // inline, popup-widget, popup-text

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const embedUrl = `${appUrl}/embed/${username}/${slug}`;
  const bookingUrl = `${appUrl}/${username}/${slug}`;

  let code = '';

  if (type === 'inline') {
    code = `<!-- kalendr.io Inline Embed -->
<div id="kalendr-embed" style="min-width:320px;height:700px;"></div>
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = '${embedUrl}';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.borderRadius = '12px';
  iframe.setAttribute('loading', 'lazy');
  document.getElementById('kalendr-embed').appendChild(iframe);
})();
</script>`;
  } else if (type === 'popup-widget') {
    code = `<!-- kalendr.io Popup Widget -->
<script>
(function() {
  var btn = document.createElement('button');
  btn.innerText = 'Book a Demo';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#03b2d1;color:white;border:none;padding:12px 24px;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(3,178,209,0.3);z-index:9999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
  btn.onclick = function() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e) { if(e.target===overlay) document.body.removeChild(overlay); };
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.style.cssText = 'width:90%;max-width:900px;height:85vh;border:none;border-radius:16px;background:white;';
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  };
  document.body.appendChild(btn);
})();
</script>`;
  } else if (type === 'popup-text') {
    code = `<!-- kalendr.io Popup Link -->
<a href="#" onclick="(function(){var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';o.onclick=function(e){if(e.target===o)document.body.removeChild(o)};var i=document.createElement('iframe');i.src='${embedUrl}';i.style.cssText='width:90%;max-width:900px;height:85vh;border:none;border-radius:16px;background:white;';o.appendChild(i);document.body.appendChild(o)})();return false;" style="color:#03b2d1;font-weight:600;text-decoration:none;">
  Book a Demo
</a>`;
  }

  return NextResponse.json({
    embedUrl,
    bookingUrl,
    type,
    code,
  });
}

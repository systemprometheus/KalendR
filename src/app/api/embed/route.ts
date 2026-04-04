import { NextRequest, NextResponse } from 'next/server';
import { getAppUrl } from '@/lib/app-url';
import { sanitizeEmbedSegment } from '@/lib/validation';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = sanitizeEmbedSegment(searchParams.get('username'));
  const slug = sanitizeEmbedSegment(searchParams.get('slug'));
  const type = searchParams.get('type') || 'inline'; // inline, popup-widget, popup-text

  if (!username || !slug || !['inline', 'popup-widget', 'popup-text'].includes(type)) {
    return NextResponse.json({ error: 'Invalid embed parameters' }, { status: 400 });
  }

  const appUrl = getAppUrl();
  const embedUrl = `${appUrl}/embed/${username}/${slug}`;
  const bookingUrl = `${appUrl}/${username}/${slug}`;
  const embedUrlLiteral = JSON.stringify(embedUrl);

  let code = '';

  if (type === 'inline') {
    code = `<!-- kalendr.io Inline Embed -->
<div id="kalendr-embed" style="min-width:320px;height:700px;"></div>
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = ${embedUrlLiteral};
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
    iframe.src = ${embedUrlLiteral};
    iframe.style.cssText = 'width:90%;max-width:900px;height:85vh;border:none;border-radius:16px;background:white;';
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  };
  document.body.appendChild(btn);
})();
</script>`;
  } else if (type === 'popup-text') {
    code = `<!-- kalendr.io Popup Link -->
<a href="#" id="kalendr-popup-link" style="color:#03b2d1;font-weight:600;text-decoration:none;">Book a Demo</a>
<script>
(function() {
  var link = document.getElementById('kalendr-popup-link');
  if (!link) return;
  link.addEventListener('click', function(event) {
    event.preventDefault();
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e) { if (e.target === overlay) document.body.removeChild(overlay); };
    var iframe = document.createElement('iframe');
    iframe.src = ${embedUrlLiteral};
    iframe.style.cssText = 'width:90%;max-width:900px;height:85vh;border:none;border-radius:16px;background:white;';
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  });
})();
</script>`;
  }

  return NextResponse.json({
    embedUrl,
    bookingUrl,
    type,
    code,
  });
}

(function(){
  const STORAGE_KEY = 'dml_matomo_consent';
  const MATOMO_URL = 'https://webanalytics.web.cern.ch/';
  const SITE_ID = '933';

  function loadMatomo(){
    var _paq = window._paq = window._paq || [];
    /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
    _paq.push(['enableLinkTracking']);
    _paq.push(['trackPageView']);
    _paq.push(['setTrackerUrl', MATOMO_URL + 'matomo.php']);
    _paq.push(['setSiteId', SITE_ID]);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.async=true; g.src=MATOMO_URL + 'matomo.js'; s.parentNode.insertBefore(g,s);
  }

  function accept(){
    try{ localStorage.setItem(STORAGE_KEY, 'accepted'); }catch(e){}
    loadMatomo();
    removeBanner();
  }
  function reject(){
    try{ localStorage.setItem(STORAGE_KEY, 'rejected'); }catch(e){}
    removeBanner();
  }
  function removeBanner(){
    const el = document.getElementById('dml-matomo-consent');
    if(el && el.parentNode) el.parentNode.removeChild(el);
  }

  function createBanner(){
    if(document.getElementById('dml-matomo-consent')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'dml-matomo-consent';
    wrapper.innerHTML = `
      <div class="dml-consent-inner">
        <div class="dml-consent-text">
          This site uses Matomo analytics to improve the site. By clicking "Accept" you consent to allow Matomo to collect anonymous usage data. See our privacy policy for details.
        </div>
        <div class="dml-consent-actions">
          <button id="dml-consent-accept" class="dml-consent-btn dml-accept">Accept</button>
          <button id="dml-consent-reject" class="dml-consent-btn dml-reject">Reject</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #dml-matomo-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;display:flex;justify-content:center}
      .dml-consent-inner{max-width:980px;width:100%;background:#fff;color:#111;border-radius:8px;padding:12px 16px;box-shadow:0 6px 24px rgba(0,0,0,0.15);display:flex;gap:12px;align-items:center}
      .dml-consent-text{flex:1;font-size:14px;line-height:1.3}
      .dml-consent-actions{display:flex;gap:8px}
      .dml-consent-btn{padding:8px 12px;border-radius:6px;border:1px solid #ccc;background:#f7f7f7;cursor:pointer;font-size:14px}
      .dml-consent-btn.dml-accept{background:#0b66c3;color:#fff;border-color:#0b66c3}
      .dml-consent-btn.dml-reject{background:transparent}
      @media (max-width:520px){ .dml-consent-inner{flex-direction:column;align-items:stretch} .dml-consent-actions{justify-content:flex-end} }
    `;

    document.head.appendChild(style);
    document.body.appendChild(wrapper);

    document.getElementById('dml-consent-accept').addEventListener('click', accept);
    document.getElementById('dml-consent-reject').addEventListener('click', reject);
  }

  function init(){
    try{
      const v = localStorage.getItem(STORAGE_KEY);
      if(v === 'accepted'){
        loadMatomo();
      }else if(v === 'rejected'){
        // do nothing
      }else{
        // show banner
        if(document.readyState === 'loading'){
          document.addEventListener('DOMContentLoaded', createBanner);
        }else{
          createBanner();
        }
      }
    }catch(e){
      // if localStorage is inaccessible, show banner and allow user to accept/reject in this session
      createBanner();
    }
  }

  // run
  init();
})();

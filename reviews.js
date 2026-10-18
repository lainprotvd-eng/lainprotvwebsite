(async () => {
  'use strict';
  const config = window.LAINPROTV_REVIEWS;
  if (!config?.enabled || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.supabaseUrl) || !config.publishableKey) return;
  // The unconfigured feature is deliberately invisible on the live site.
  const scriptUrl = new URL(document.currentScript?.src || '/reviews.js', location.href);
  const script = document.createElement('script');
  script.src = new URL('assets/vendor/supabase-2.118.0.js', scriptUrl).href;
  try { await new Promise((resolve,reject) => { script.onload=resolve; script.onerror=reject; document.head.append(script); }); } catch { return; }
  const client = window.supabase.createClient(config.supabaseUrl, config.publishableKey);
  const t = (en,ru) => document.documentElement.lang === 'ru' ? ru : en;
  const state = {user:null,profile:null,moderator:false,mine:null,items:[],count:0,average:null,page:0,busy:false,message:null};
  const slug = location.pathname.split('/').filter(Boolean)[0] || '';
  const projects = new Set(['ice-scream-1','ice-scream-1-j-asks-for-help','ice-scream-2','ice-scream-2-charlies-revenge','ice-scream-3','ice-scream-4','ice-scream-5','ice-scream-6','ice-scream-7','ice-scream-8','dark-internet','the-twins']);
  const redirect = new URL('/',location.origin).href;
  function el(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!==undefined)n.textContent=text; return n; }
  function button(text, action, cls='') { const b=el('button',cls,text);b.type='button';b.addEventListener('click',action);return b; }
  const account = el('div','review-account');
  document.querySelector('.topbar')?.append(account);
  const dialog=el('dialog','auth-dialog');dialog.setAttribute('aria-label','Account / Аккаунт');document.body.append(dialog);
  let authMode='signin',authMessage=null;
  function notify(en,ru) {state.message=[en,ru]; if(status)status.textContent=t(en,ru);}
  function authError(error) {
    if(error?.code==='invalid_credentials')return t('Incorrect email or password.','Неверный email или пароль.');
    if(error?.code==='email_not_confirmed')return t('Confirm your email before signing in.','Подтверди email перед входом.');
    if(error?.status===429)return t('Too many requests. Try again later.','Слишком много запросов. Попробуй позже.');
    return t('The request could not be completed. Please try again.','Не удалось выполнить запрос. Попробуй ещё раз.');
  }
  function openAuth(mode='signin') {authMode=mode;authMessage=null;renderAuth();if(!dialog.open)dialog.showModal();}
  function renderAuth() {
    const old={};dialog.querySelectorAll('input').forEach(i=>old[i.name]=i.value);
    dialog.replaceChildren(button('×',()=>dialog.close(),'review-secondary auth-close'));
    const labels={signin:t('Sign in','Войти'),signup:t('Create account','Создать аккаунт'),reset:t('Reset password','Сбросить пароль'),password:t('Set a new password','Задать новый пароль'),profile:t('Choose your nickname','Выбрать никнейм')};
    dialog.append(el('h2','',labels[authMode]));
    const form=el('form');
    const field=(name,label,type,autocomplete)=>{const id='auth-'+name,l=el('label','',label);l.htmlFor=id;const i=el('input');i.id=id;i.name=name;i.type=type;i.autocomplete=autocomplete;i.required=true;if(old[name])i.value=old[name];form.append(l,i);return i;};
    if(['signup','profile'].includes(authMode)){const i=field('username',t('Nickname (3–24 letters, numbers or underscores)','Никнейм (3–24 латинские буквы, цифры или _)'),'text','nickname');i.minLength=3;i.maxLength=24;i.pattern='[A-Za-z0-9_]{3,24}';}
    if(['signin','signup','reset'].includes(authMode))field('email','Email','email','email');
    if(['signin','signup','password'].includes(authMode)){const i=field('password',t('Password','Пароль'),'password',authMode==='signin'?'current-password':'new-password');i.minLength=authMode==='signin'?1:10;if(authMode!=='signin')form.append(el('p','review-notice',t('Use at least 10 characters.','Используй не менее 10 символов.')));}
    const feedback=el('p','review-status',authMessage||'');feedback.setAttribute('role','status');const submit=el('button','',labels[authMode]);submit.type='submit';form.append(feedback,submit);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(submit.disabled)return;submit.disabled=true;
      const fields=Object.fromEntries(new FormData(form));
      try {
        if(authMode==='signup'){
          const {error}=await client.auth.signUp({email:fields.email,password:fields.password,options:{data:{username:fields.username},emailRedirectTo:redirect}});if(error)throw error;
          form.reset();feedback.textContent=t('Check your email to confirm your account. Then sign in.','Проверь почту и подтверди аккаунт. Затем войди.');
        } else if(authMode==='signin'){
          const {error}=await client.auth.signInWithPassword({email:fields.email,password:fields.password});if(error)throw error;dialog.close();
        } else if(authMode==='reset'){
          const {error}=await client.auth.resetPasswordForEmail(fields.email,{redirectTo:redirect});if(error)throw error;
          feedback.textContent=t('If an account exists, a password reset link has been sent.','Если аккаунт существует, письмо для сброса пароля отправлено.');
        } else if(authMode==='password'){
          const {error}=await client.auth.updateUser({password:fields.password});if(error)throw error;form.reset();dialog.close();
        } else if(authMode==='profile'){
          const result=state.profile?await client.from('profiles').update({username:fields.username}).eq('id',state.user.id):await client.from('profiles').insert({id:state.user.id,username:fields.username});if(result.error)throw result.error;await loadProfile();dialog.close();render();
        }
      } catch(error){feedback.textContent=error?.code==='23505'?t('That nickname is taken. Choose another.','Этот никнейм занят. Выбери другой.'):authError(error);}finally{submit.disabled=false;}
    });
    dialog.append(form);
    if(['signin','signup','reset'].includes(authMode)){
      const actions=el('div','auth-actions');
      if(authMode!=='signin')actions.append(button(labels.signin,()=>openAuth('signin'),'review-secondary'));
      if(authMode!=='signup')actions.append(button(labels.signup,()=>openAuth('signup'),'review-secondary'));
      if(authMode!=='reset')actions.append(button(t('Forgot password?','Забыл пароль?'),()=>openAuth('reset'),'review-secondary'));
      dialog.append(actions,el('p','review-notice',t('Your nickname is public. Your email is not shown in reviews.','Никнейм виден всем. Email в отзывах не показывается.')));
    }
  }
  const section=projects.has(slug)?el('section','reviews-section'):null;
  let status;
  if(section){section.id='reviews';document.querySelector('.installation-guide')?.before(section);}
  async function loadProfile(){
    state.profile=null;state.moderator=false;if(!state.user)return;
    let {data,error}=await client.from('profiles').select('id,username').eq('id',state.user.id).maybeSingle();if(error)throw error;
    if(!data && /^[A-Za-z0-9_]{3,24}$/.test(state.user.user_metadata?.username||'')){
      const inserted=await client.from('profiles').insert({id:state.user.id,username:state.user.user_metadata.username}).select('id,username').single();
      if(!inserted.error)data=inserted.data;
    }
    state.profile=data;
    const admin=await client.rpc('is_review_moderator');state.moderator=!admin.error && admin.data===true;
  }
  async function loadReviews(reset=true){
    if(!section)return;if(reset)state.page=0;
    const start=state.page*20;
    const [summary,list,mine]=await Promise.all([
      client.rpc('review_summary',{project:slug}),
      client.from('map_reviews').select('id,rating,body,created_at,updated_at,user_id,profiles(username)').eq('project_slug',slug).eq('hidden',false).order('created_at',{ascending:false}).range(start,start+19),
      state.user?client.from('map_reviews').select('id,rating,body,hidden').eq('project_slug',slug).eq('user_id',state.user.id).maybeSingle():Promise.resolve({data:null})
    ]);
    if(summary.error||list.error||mine.error)throw summary.error||list.error||mine.error;
    state.items=reset?list.data:state.items.concat(list.data);state.mine=mine.data;state.count=Number(summary.data?.[0]?.review_count||0);state.average=summary.data?.[0]?.average_rating;
  }
  function render(){
    account.replaceChildren();
    if(state.user){account.append(el('span','',state.profile?.username||t('Account','Аккаунт')),button(t('Nickname','Никнейм'),()=>openAuth('profile'),'review-secondary'),button(t('Sign out','Выйти'),async()=>{await client.auth.signOut()},'review-secondary'));}
    else account.append(button(t('Sign in','Войти'),()=>openAuth()),button(t('Register','Регистрация'),()=>openAuth('signup'),'review-secondary'));
    if(!section)return;
    const draft=section.querySelector('textarea')?.value;
    const selected=section.querySelector('input[name="rating"]:checked')?.value;
    section.replaceChildren();const heading=el('div','reviews-heading');heading.append(el('h2','',t('Player reviews','Отзывы игроков')));section.append(heading);
    const summary=el('p','review-summary');if(state.count){summary.append(el('strong','',Number(state.average).toFixed(1)+' ★'),document.createTextNode(' / 5 · '+state.count+' '+t('reviews','отзывов')));}else summary.textContent=t('No ratings yet. Be the first to review this map.','Оценок пока нет. Оставь первый отзыв об этой карте.');section.append(summary);
    status=el('p','review-status',state.message?t(...state.message):'');status.setAttribute('role','status');section.append(status);
    if(!state.user){section.append(el('p','review-notice',t('Sign in to leave a rating and review. One review per account for each map.','Войди, чтобы оставить оценку и отзыв. Один отзыв на аккаунт для каждой карты.')),button(t('Sign in or register','Войти или зарегистрироваться'),()=>openAuth()));}
    else if(!state.profile)section.append(button(t('Choose a nickname to write a review','Выбери никнейм, чтобы написать отзыв'),()=>openAuth('profile')));
    else if(state.mine?.hidden)section.append(el('p','review-notice',t('Your review was removed by a moderator. Contact LainProTV if you have questions.','Твой отзыв удалён модератором. Если есть вопросы, свяжись с LainProTV.')));
    else {
      const form=el('form','review-form');form.append(el('h3','',state.mine?t('Edit your review','Редактировать свой отзыв'):t('Your review','Твой отзыв')));
      const fieldset=el('fieldset');fieldset.append(el('legend','',t('Rating','Оценка')));const options=el('div','star-options');
      for(let n=1;n<=5;n++){const label=el('label');const input=el('input');input.type='radio';input.name='rating';input.value=String(n);input.required=true;input.checked=String(selected||state.mine?.rating||'')===String(n);label.append(input,document.createTextNode(n+' ★'));options.append(label);}fieldset.append(options);form.append(fieldset);
      const label=el('label','',t('Review (5–2,000 characters)','Отзыв (5–2 000 символов)'));label.htmlFor='review-body';const body=el('textarea');body.id='review-body';body.name='body';body.minLength=5;body.maxLength=2000;body.required=true;body.value=draft??state.mine?.body??'';const submit=el('button','',state.mine?t('Save changes','Сохранить изменения'):t('Post review','Опубликовать отзыв'));submit.type='submit';submit.disabled=state.busy;form.append(label,body,submit);
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(state.busy)return;const values=Object.fromEntries(new FormData(form));const rating=Number(values.rating),text=values.body.trim();if(!Number.isInteger(rating)||rating<1||rating>5||text.length<5||text.length>2000)return;
        state.busy=true;submit.disabled=true;
        try{const payload={rating,body:text};const result=state.mine?await client.from('map_reviews').update(payload).eq('id',state.mine.id):await client.from('map_reviews').insert({...payload,project_slug:slug,user_id:state.user.id});if(result.error)throw result.error;await loadReviews();state.message=['Review saved.','Отзыв сохранён.'];}
        catch(error){notify('Could not save the review. Check your connection and try again.','Не удалось сохранить отзыв. Проверь соединение и попробуй снова.');await loadReviews().catch(()=>{});}finally{state.busy=false;render();}
      });section.append(form);
    }
    const list=el('div','review-list');
    state.items.forEach(review=>{
      const card=el('article','review-card');const name=review.profiles?.username||t('Player','Игрок');const avatar=el('div','review-avatar',name.charAt(0).toUpperCase());avatar.setAttribute('aria-hidden','true');const content=el('div'),author=el('div','review-author');const stars=el('span','review-stars','★'.repeat(review.rating)+'☆'.repeat(5-review.rating));stars.setAttribute('aria-label',review.rating+' / 5');author.append(el('strong','',name),stars);content.append(author);
      const date=el('time','review-date',new Date(review.created_at).toLocaleDateString(document.documentElement.lang==='ru'?'ru-RU':'en-GB'));date.dateTime=review.created_at;content.append(date,el('p','review-body',review.body));
      if(state.moderator)content.append(button(t('Remove review','Удалить отзыв'),async()=>{
        if(!confirm(t('Remove this review from the public page?','Удалить этот отзыв со страницы?')))return;
        const result=await client.rpc('hide_review',{review_id:review.id});if(result.error){notify('Removal failed.','Не удалось удалить отзыв.');return;}await loadReviews();render();
      },'review-secondary review-moderate'));
      card.append(avatar,content);list.append(card);
    });section.append(list);
    if(state.items.length<state.count)section.append(button(t('Load more reviews','Загрузить ещё отзывы'),async()=>{state.page++;try{await loadReviews(false);render()}catch{state.page--;notify('Could not load reviews.','Не удалось загрузить отзывы.')}},'review-secondary review-load'));
  }
  async function refresh(user){state.user=user;state.message=null;try{await loadProfile();await loadReviews();}catch{state.message=['Reviews are temporarily unavailable. Please try again later.','Отзывы временно недоступны. Попробуй позже.'];}render();}
  client.auth.onAuthStateChange((event,session)=>{setTimeout(async()=>{await refresh(session?.user||null);if(event==='PASSWORD_RECOVERY')openAuth('password');},0);});
  let renderedLanguage=document.documentElement.lang;
  new MutationObserver(()=>{
    if(document.documentElement.lang===renderedLanguage)return;
    renderedLanguage=document.documentElement.lang;render();if(dialog.open)renderAuth();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  const {data}=await client.auth.getSession();await refresh(data?.session?.user||null);
})();

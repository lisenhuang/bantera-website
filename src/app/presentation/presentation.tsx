'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { closingQuote, demoVideo, media, slides } from './content';
import s from './presentation.module.css';
import { useAutoplay } from './use-autoplay';

function subscribe(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}
function currentSlide() {
  const id = window.location.hash.slice(1);
  return Math.max(0, slides.findIndex(slide => slide.id === id));
}

function MediaSlot({ kind, title, detail, autoplay = false }: { kind: 'demo' | 'deployment' | 'backup'; title: string; detail: string; autoplay?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const source = media[kind];
  if (source && !failed) {
    return kind === 'demo'
      ? <video key={useFallback ? 'h264' : 'hevc'} className={s.video} src={useFallback || autoplay ? demoVideo.fallback : source} controls playsInline preload="metadata" poster={demoVideo.poster} onError={() => useFallback ? setFailed(true) : setUseFallback(true)} aria-label="Recorded Bantera demonstration with New Zealand English">
          Your browser cannot play this video.
        </video>
      : <Image className={s.screenshot} src={source} alt={title} width={1600} height={1000} unoptimized onError={() => setFailed(true)} />;
  }
  return <div className={s.mediaPlaceholder}>
    <span className={s.mediaMark} aria-hidden="true">{kind === 'demo' ? '▷' : '＋'}</span>
    <p className={s.mediaTitle}>{title}</p>
    <p className={s.mediaDetail}>{failed ? 'This media could not be loaded.' : detail}</p>
    <span className={s.pending}>{failed ? 'Media unavailable' : kind === 'demo' ? 'Video coming soon' : 'Screenshot coming soon'}</span>
  </div>;
}

export default function Presentation() {
  const index = useSyncExternalStore(subscribe, currentSlide, () => 0);
  const [revealed, setRevealed] = useState(false);
  const [overview, setOverview] = useState(false);
  const [notes, setNotes] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [notice, setNotice] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLElement>(null);
  const slide = slides[index];

  const go = useCallback((next: number) => {
    const target = Math.min(slides.length - 1, Math.max(0, next));
    setRevealed(false);
    setOverview(false);
    window.location.hash = slides[target].id;
  }, []);
  const playback = useAutoplay({ root, go, reveal: setRevealed, notify: setNotice });
  const stopPlayback = playback.stop;
  const pausePlayback = playback.pause;
  const manualGo = useCallback((next: number) => { stopPlayback(); go(next); }, [go, stopPlayback]);
  const advance = useCallback(() => {
    stopPlayback();
    if (index === 1 && !revealed) setRevealed(true);
    else go(index + 1);
  }, [index, revealed, go, stopPlayback]);
  const previous = useCallback(() => {
    stopPlayback();
    if (index === 1 && revealed) setRevealed(false);
    else go(index - 1);
  }, [index, revealed, go, stopPlayback]);
  const toggleFullScreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setNotice('Use your browser’s full-screen option on this device.');
    } catch {
      setNotice('Full screen is unavailable here. Use your browser’s full-screen option.');
    }
  }, []);

  useEffect(() => {
    const onFullScreen = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullScreen);
    return () => document.removeEventListener('fullscreenchange', onFullScreen);
  }, []);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (heading.current) heading.current.scrollTop = 0;
  }, [index]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (event.altKey || event.metaKey || event.ctrlKey || element.closest('input, textarea, select, video, [contenteditable="true"]')) return;
      if (event.key === 'Escape') { stopPlayback(); setOverview(false); setNotes(false); return; }
      if (event.key.toLowerCase() === 'o') { event.preventDefault(); pausePlayback(); setOverview(value => !value); return; }
      if (event.key.toLowerCase() === 'n') { event.preventDefault(); setNotes(value => !value); return; }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); void toggleFullScreen(); return; }
      if (overview || (element.closest('button, a') && [' ', 'Enter'].includes(event.key))) return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); advance(); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) { event.preventDefault(); previous(); }
      if (event.key === 'Home') { event.preventDefault(); manualGo(0); }
      if (event.key === 'End') { event.preventDefault(); manualGo(slides.length - 1); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [advance, previous, manualGo, overview, toggleFullScreen, stopPlayback, pausePlayback]);

  return <div ref={root} className={s.deck}>
    <header className={s.topbar}>
      <Link href="/" className={s.brand} aria-label="Bantera homepage">bantera<span>.</span></Link>
      <span className={s.chapter}>{slide.section}</span>
      <button className={s.menuButton} aria-expanded={overview} aria-controls="slide-overview" onClick={() => { playback.pause(); setOverview(value => !value); }}>All slides <span aria-hidden="true">↗</span></button>
    </header>

    <main ref={heading} tabIndex={-1} className={s.stage} aria-label={`Slide ${index + 1} of ${slides.length}: ${slide.title}`}>
      <div className={s.slide} key={slide.id}>
        {slide.id === 'hello' && <div className={s.cover}>
          <p className={s.eyebrow}>A personal story. A language app.</p>
          <h1>A conversation<br />worth <em>building</em> for.</h1>
          <div className={s.coverBottom}><p>Why I built Bantera,<br />and how it works.</p><p className={s.signature}>Ethan Huang<br /><span>Creator & fellow learner</span></p></div>
        </div>}

        {slide.id === 'google-maps' && <div className={s.church}>
          <p className={s.eyebrow}>After a free English class at church</p>
          <h1>“How did you<br /><em>find</em> this class?”</h1>
          <div className={`${s.answer} ${revealed ? s.answerVisible : ''}`} aria-hidden={!revealed}>
            <span>Me, after thinking for a moment</span><p>“I found it on Google Maps.”</p>
          </div>
          {!revealed && <button className={s.revealButton} onClick={() => { stopPlayback(); setRevealed(true); }}>My answer <span aria-hidden="true">↗</span></button>}
        </div>}

        {slide.id === 'why' && <div className={s.why}>
          <p className={s.eyebrow}>The gap I wanted to close</p>
          <h1>I knew more words.<br />I wanted more<br /><em>conversation.</em></h1>
          <div className={s.twoThoughts}><p>Reading and writing<br /><strong>Time to think. AI to help.</strong></p><p>Listening and speaking<br /><strong>A person in front of me. My turn to respond.</strong></p></div>
        </div>}

        {slide.id === 'accents' && <div className={`${s.split} ${s.garage}`}>
          <div><p className={s.eyebrow}>A visit to the garage</p><h1>Even in<br />my <em>own<br />language.</em></h1><p className={s.body}>I prepared in English.<br />The mechanic spoke Chinese.<br />His accent was unfamiliar.</p><p className={s.garageStat}><strong>70%</strong><span>About how much I understood.</span></p></div>
          <figure className={s.garagePhoto}><Image src="/presentation/garage-conversation.png" alt="A mechanic explaining a brake repair to a customer beside a car in a workshop." width={1122} height={1402} sizes="(max-width: 760px) 86vw, 45vw" /></figure>
        </div>}

        {slide.id === 'sweet-as' && <div className={`${s.split} ${s.photoSplit}`}>
          <div><p className={s.eyebrow}>A little bit of New Zealand</p><h1>“Sweet <em>as.</em>”</h1><p className={s.body}>A Kiwi friend taught me this last year.<br />Then I saw it in The Warehouse.</p><p className={s.photoCaption}>I sent her the photo.</p><p className={s.smallLabel}>Slang, a memory, and someone who helped.</p></div>
          <figure className={s.chatFigure}>
            <Image className={s.chatImage} src="/presentation/sweet-as-chat-v3.png" alt="WhatsApp-style conversation titled Sweet as Kiwi friend with a kiwi bird profile picture. I send my Sweet As sign photo and ask: Do you remember teaching me sweet as? I saw this and thought of you. My Kiwi friend replies with thumbs up and face with tears of joy emojis." width={1086} height={1448} sizes="(max-width: 760px) 86vw, 40vw" priority />
          </figure>
        </div>}

        {slide.id === 'demo' && <div className={s.demo}>
          <div><p className={s.eyebrow}>Bantera in action</p><h1>A little practice<br /><em>before real life.</em></h1><p className={s.body}>One situation. New Zealand English.<br />A conversation to listen to and practise.</p></div>
          <MediaSlot autoplay={playback.status !== 'idle'} kind="demo" title="Hear it. Try it." detail="A short tour of Bantera, with a New Zealand accent." />
        </div>}

        {slide.id === 'language-accents' && <div className={s.featureSlide}>
          <div><p className={s.eyebrow}>Language and accent</p><h1>A language,<br />and the <em>accents<br />within it.</em></h1><p className={s.body}>English sounds different around the world.<br />I wanted to practise hearing those differences.</p><p className={s.featureNote}>Nine regional English options shown here,<br />including New Zealand.</p></div>
          <figure className={s.appFigure}><Image src="/presentation/language-accents.jpg" alt="Bantera learning-language selector with English options for the United States, United Kingdom, Australia, Canada, India, New Zealand, Ireland, Singapore and South Africa." width={1206} height={2461} sizes="(max-width: 760px) 80vw, 35vw" /><figcaption>Language and accent selection</figcaption></figure>
        </div>}

        {slide.id === 'ai-scenarios' && <div className={s.featureSlide}>
          <div><p className={s.eyebrow}>Learning through real situations</p><h1>English I’m<br /><em>about to use.</em></h1><p className={s.body}>Before a visit to the garage, I generate<br />a car-repair dialogue and practise<br />the words and expressions I’ll need.</p><p className={s.scenarioReflection}>For me, English sticks when I have a reason to use it.</p><p className={s.featureNote}>15 scenarios, or a custom situation of your own.</p></div>
          <figure className={s.appFigure}><Image src="/presentation/ai-scenarios.jpg" alt="Generate with AI screen showing New Zealand English, 15 preset scenarios plus a Custom option, Coffee shop selected, and dialogue durations from one to four minutes." width={1206} height={2465} sizes="(max-width: 760px) 80vw, 35vw" /><figcaption>Everyday scenarios, with room for your own</figcaption></figure>
        </div>}

        {slide.id === 'voice-exchange' && <div className={`${s.featureSlide} ${s.exchangeSlide}`}>
          <div><p className={s.eyebrow}>Practising with people</p><h1>We can help<br /><em>each other.</em></h1>
            <div className={s.exchangeExample}><p><span>I speak Chinese</span>I’m learning English.</p><p><span>You speak English</span>You’re learning Chinese.</p></div>
            <p className={s.featureNote}><strong>Every message starts with your voice.</strong><br />Voice messages only, to practise speaking and listening.<br />Transcription and translation when you need help.</p>
          </div>
          <figure className={s.appFigure}><Image src="/presentation/voice-exchange.jpg" alt="Bantera conversation showing voice messages with playback and Transcribe buttons, plus a Hold to record audio control for sending a voice message." width={1206} height={2470} sizes="(max-width: 760px) 80vw, 35vw" /><figcaption>A conversation through voice messages</figcaption></figure>
        </div>}

        {slide.id === 'pipeline' && <div className={`${s.featureSlide} ${s.pipelineSlide}`}>
          <div>
            <p className={s.eyebrow}>After choosing a situation, language and accent</p>
            <h1>Inside the<br /><em>AI pipeline.</em></h1>
            <ol className={s.pipelineSteps}>
              <li><span>01</span><div><h2>Write the dialogue</h2><p>Gemini creates the conversation.</p></div></li>
              <li><span>02</span><div><h2>Generate the audio</h2><p>Gemini speech gives it two voices.</p></div></li>
              <li><span>03</span><div><h2>Align words with audio</h2><p>Rev.ai and fallback timing match each sentence to the recording.</p></div></li>
            </ol>
            <p className={s.featureNote}>Ready to listen, repeat, record and compare.</p>
          </div>
          <figure className={s.appFigure}><Image src="/presentation/ai-pipeline.jpg" alt="Bantera generation progress screen: writing dialogue and generating audio are complete, while aligning audio is in progress." width={1206} height={2462} sizes="(max-width: 760px) 80vw, 35vw" /><figcaption>The generation steps, as they appear in Bantera</figcaption></figure>
        </div>}

        {slide.id === 'codebases' && <div className={s.architecture}>
          <p className={s.eyebrow}>Three separate codebases</p><h1>One app.<br /><em>A few moving parts.</em></h1>
          <div className={s.repositories}>
            <div><span className={s.repoNumber}>01 / In your hand</span><h2>Flutter</h2><p>iOS & Android</p><span className={s.repoDetail}>Listening and speaking practice</span></div>
            <div><span className={s.repoNumber}>02 / Behind the scenes</span><h2>.NET</h2><p>The backend</p><span className={s.repoDetail}>Accounts, AI generation and content</span></div>
            <div><span className={s.repoNumber}>03 / On the web</span><h2>Next.js</h2><p>The website</p><span className={s.repoDetail}>Homepage, shared practice and admin</span></div>
          </div><p className={s.storage}>PostgreSQL <span>application data</span><b>·</b> Cloudflare R2 <span>audio storage</span></p>
        </div>}

        {slide.id === 'deployment' && <div className={s.operationsSlide}>
          <p className={s.eyebrow}>My Ubuntu server</p>
          <h1>Running Bantera with <em>OpenClaw.</em></h1>
          <p className={s.operationsIntro}>I ask for a deployment. OpenClaw reports the result.</p>
          <figure className={s.operationsFigure}>
            <div className={s.deploymentCrop}><Image src={media.deployment!} alt="OpenClaw conversation: I request a new Bantera website deployment. The bot reports successful deployment, a commit, local and public HTTP 200 health checks, and running website and cloudflared containers." width={2354} height={1846} sizes="90vw" unoptimized /></div>
            <figcaption>A website deployment request and OpenClaw’s report</figcaption>
          </figure>
        </div>}

        {slide.id === 'backup' && <div className={`${s.operationsSlide} ${s.backupSlide}`}>
          <p className={s.eyebrow}>Looking after Bantera</p>
          <h1>A backup, every day at <em>5 a.m.</em></h1>
          <p className={s.operationsIntro}>An OpenClaw cron job backs up the database<br />and sends the file straight to my chat.</p>
          <figure className={s.backupFigure}>
            <div className={`${s.backupCrop} ${s.backupSeptember16}`}><Image src={media.backup!} alt="16 September: a Bantera database SQL ZIP backup attachment, 1.8 MB, delivered to the chat at 5:00 AM with a Download link." width={2170} height={1846} sizes="90vw" unoptimized /></div>
            <div className={`${s.backupCrop} ${s.backupSeptember17}`}><Image src={media.backup!} alt="17 September: the next daily Bantera database SQL ZIP backup attachment, 1.8 MB, delivered at 5:00 AM with a Download link." width={2170} height={1846} sizes="90vw" unoptimized /></div>
            <figcaption>Two daily deliveries, shown from the chat</figcaption>
          </figure>
          <p className={s.backupMessage}>The file stays in the chat, ready to download when I need it.</p>
          <p className={s.featureNote}>Database backups are an important part of running Bantera.</p>
        </div>}

        {slide.id === 'try' && <div className={s.split}>
          <div><p className={s.eyebrow}>Your turn</p><h1>What would<br /><em>you practise?</em></h1><p className={s.body}>A job interview? A visit to the garage?<br />Or simply a conversation over coffee?</p><a className={s.siteLink} href="https://bantera.app" target="_blank" rel="noreferrer">bantera.app ↗</a></div>
          <div className={s.qr}><QRCodeSVG value="https://bantera.app" size={220} level="M" marginSize={4} title="Scan to open Bantera" /><p>Try a conversation of your own.</p></div>
        </div>}

        {slide.id === 'colours' && <div className={`${s.closing} ${media.closing ? s.withClosingImage : ''}`}>
          {media.closing && <Image className={s.closingImage} src={media.closing} alt="Closing photograph for the reflection on accents and colours" fill unoptimized />}
          <div className={s.closingWords}>
            <figure className={s.lyric}><p className={s.lyricMeaning}>{closingQuote.english}</p><p className={s.chineseLyric} lang="zh-Hant">{closingQuote.chineseLyric}</p><figcaption><a className={s.artistName} href={closingQuote.source} target="_blank" rel="noreferrer">{closingQuote.attribution}</a><span className={s.artistDescription}>{closingQuote.artistDescription}</span><span className={s.translationNote}>{closingQuote.translationNote}</span></figcaption></figure>
            <div className={s.reflection}><p className={s.eyebrow}>What it means to me</p><h1>Every accent<br />adds <em>colour.</em></h1><p className={s.body}>I’d love to meet people from all over the world<br />and make new friends.</p></div>
          </div>
        </div>}
      </div>
    </main>

    <div className={s.playbackBar}>
      {playback.status === 'idle' ? <button className={s.autoplayButton} onClick={() => { setNotes(false); setOverview(false); playback.start(slide.id); }}>▶ Autoplay</button> : <>
        <button className={s.autoplayButton} onClick={playback.status === 'playing' ? playback.pause : playback.resume}>{playback.status === 'playing' ? 'Ⅱ Pause' : '▶ Resume'}</button>
        <button className={s.stopButton} onClick={playback.stop}>Stop</button>
      </>}
      <button className={s.speedButton} onClick={playback.cycleAudioSpeed} aria-label={`Audio speed: ${playback.audioSpeed}×. Change audio speed`} title="Change narration speed (0.75×–2×). Videos stay at 1×.">Audio {playback.audioSpeed}×</button>
      <span aria-live="polite">{playback.status === 'idle' ? 'AI narration · Play from this slide' : `${playback.status === 'paused' ? 'Paused · ' : ''}${playback.caption}`}</span>
    </div>
    <footer className={s.controls}>
      <div className={s.utilities}><button aria-pressed={notes} onClick={() => setNotes(value => !value)} title="Speaker cues, visible on this screen (N)">Cues</button><button onClick={() => void toggleFullScreen()} title="Toggle full screen (F)">{fullScreen ? 'Exit full screen' : 'Full screen'}</button></div>
      <span className={s.keyboardHint}>← → to move <span>·</span> F full screen</span>
      <div className={s.navigation}><button aria-label="Previous slide" disabled={index === 0} onClick={previous}>←</button><span aria-live="polite">{String(index + 1).padStart(2, '0')} <span>/ {String(slides.length).padStart(2, '0')}</span></span><button aria-label={index === 1 && !revealed ? 'Reveal Google Maps answer' : 'Next slide'} disabled={index === slides.length - 1} onClick={advance}>→</button></div>
    </footer>
    <div className={s.progress} aria-hidden="true"><div style={{ width: `${((index + 1) / slides.length) * 100}%` }} /></div>

    {notes && <aside className={s.notes} aria-label="Speaker cues"><div><strong>Speaker cues · visible on this screen</strong><button onClick={() => setNotes(false)} aria-label="Close speaker cues">×</button></div><p>{slide.notes}</p></aside>}
    {notice && <div className={s.notice} role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
    {overview && <section id="slide-overview" className={s.overview} aria-label="Slide overview"><div className={s.overviewHeader}><h2>The conversation</h2><button onClick={() => setOverview(false)}>Close ×</button></div><div className={s.overviewGrid}>{slides.map((item, i) => <button key={item.id} className={i === index ? s.selected : ''} onClick={() => manualGo(i)} aria-current={i === index ? 'step' : undefined}><span>{String(i + 1).padStart(2, '0')} / {item.section}</span><strong>{item.title}</strong></button>)}</div></section>}
  </div>;
}

import { useEffect, useRef, useState } from 'react';

import Hls from 'hls.js';

import styles from './VideoPlayer.module.css';

const VideoPlayer = ({ video, onRefreshSource }) => {
  const videoRef = useRef(null);
  const resumeTimeRef = useRef(0);
  const refreshingRef = useRef(false);

  const [source, setSource] = useState(video);
  const [refreshing, setRefreshing] = useState(false);
  const [playbackError, setPlaybackError] = useState('');

  useEffect(() => {
    setSource(video);
  }, [video]);

  const refreshSource = async () => {
    const videoElement = videoRef.current;

    if (
      refreshingRef.current ||
      !onRefreshSource ||
      !videoElement
    ) {
      return;
    }

    refreshingRef.current = true;
    resumeTimeRef.current = videoElement.currentTime || 0;

    setRefreshing(true);
    setPlaybackError('');

    try {
      const refreshedVideo = await onRefreshSource();

      if (
        refreshedVideo?.status !== 'READY' ||
        !refreshedVideo?.hlsUrl
      ) {
        setPlaybackError(
          'Не вдалося оновити посилання на відео.',
        );

        return;
      }

      setSource(refreshedVideo);
    } catch (error) {
      console.error(
        'Не вдалося оновити посилання на відео:',
        error,
      );

      setPlaybackError(
        'Не вдалося продовжити відтворення відео.',
      );
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;

    if (
      !videoElement ||
      source?.status !== 'READY' ||
      !source?.hlsUrl
    ) {
      return undefined;
    }

    setPlaybackError('');

    const restorePlaybackPosition = () => {
      if (resumeTimeRef.current > 0) {
        videoElement.currentTime =
          resumeTimeRef.current;

        resumeTimeRef.current = 0;
      }
    };

    if (
      videoElement.canPlayType(
        'application/vnd.apple.mpegurl',
      )
    ) {
      videoElement.src = source.hlsUrl;

      videoElement.addEventListener(
        'loadedmetadata',
        restorePlaybackPosition,
      );

      return () => {
        videoElement.removeEventListener(
          'loadedmetadata',
          restorePlaybackPosition,
        );

        videoElement.removeAttribute('src');
        videoElement.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls();

      hls.loadSource(source.hlsUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        restorePlaybackPosition();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        const status =
          data?.response?.code ??
          data?.networkDetails?.status;

        if (
          data.fatal &&
          data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          status === 403
        ) {
          refreshSource();
        }
      });

      return () => {
        hls.destroy();
      };
    }

    setPlaybackError(
      'Ваш браузер не підтримує HLS-відео.',
    );

    return undefined;
  }, [source?.status, source?.hlsUrl]);

  if (!source) {
    return (
      <div className={styles.state}>
        Відео для цього уроку не додано.
      </div>
    );
  }

  if (source.status === 'PROCESSING') {
    return (
      <div className={styles.state}>
        Відео ще обробляється.
      </div>
    );
  }

  if (source.status === 'UNAVAILABLE') {
    return (
      <div className={styles.state}>
        Відео тимчасово недоступне.
      </div>
    );
  }

  if (
    source.status !== 'READY' ||
    !source.hlsUrl
  ) {
    return (
      <div className={styles.state}>
        Відео тимчасово недоступне.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.player}>
        <video
          ref={videoRef}
          className={styles.video}
          controls
          playsInline
        >
          Ваш браузер не підтримує відтворення відео.
        </video>

        {refreshing && (
          <div className={styles.refreshing}>
            Оновлення відео...
          </div>
        )}
      </div>

      {playbackError && (
        <p className={styles.error}>
          {playbackError}
        </p>
      )}
    </div>
  );
};

export default VideoPlayer;
import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { KokoroVoice, TTSModel } from '@/types';

const execAsync = promisify(exec);

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout

const MODELS = {
  kokoro: "jaaari/kokoro-82m:dfdf537ba482b029e0a761699e6f55e9162cfd159270bfe0e44857caa5f275a6",
  xtts: "lucataco/xtts-v2:684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e"
} as const;

const XTTS_SPEAKERS = {
  male: "https://replicate.delivery/pbxt/Jt79w0xsT64R1JsiJ0LQRL8UcWspg5J4RFrU6YwEKpOT1ukS/male.wav",
  female: "https://replicate.delivery/pbxt/JqzxMWScZ4O44XwIwWveDoeAE2Ga7gYdnXKb8l18Fv7D3QEx/female.wav"
} as const;

type XTTS_Speaker = keyof typeof XTTS_SPEAKERS;
const XTTS_SPEAKER_KEYS = Object.keys(XTTS_SPEAKERS) as XTTS_Speaker[];

const KOKORO_VOICES = [
  'af_bella',
  'af_sarah',
  'am_adam',
  'am_michael',
  'bf_emma',
  'bf_isabella',
  'bm_george',
  'bm_lewis',
  'af_nicole',
  'af_sky'
] as const;

async function getFfmpegPath(): Promise<string> {
  try {
    const { stdout } = await execAsync('which ffmpeg');
    const ffmpegPath = stdout.trim();
    if (!ffmpegPath) {
      throw new Error('ffmpeg not found in PATH');
    }
    return ffmpegPath;
  } catch (error) {
    console.error('Error finding ffmpeg:', error);
    // Fallback to common locations
    const commonPaths = [
      '/usr/local/bin/ffmpeg',
      '/usr/bin/ffmpeg',
      'ffmpeg'
    ];
    
    for (const path of commonPaths) {
      try {
        await execAsync(`${path} -version`);
        return path;
      } catch (e) {
        console.warn(`ffmpeg not found at ${path}`);
      }
    }
    
    throw new Error('ffmpeg not found in system');
  }
}

async function convertToMp3(inputBuffer: Buffer): Promise<Buffer> {
  const inputPath = join(tmpdir(), `input-${Date.now()}.wav`);
  const outputPath = join(tmpdir(), `output-${Date.now()}.mp3`);

  try {
    // Write input file
    await writeFile(inputPath, inputBuffer);
    console.log('Input file written to:', inputPath);

    // Debug environment
    console.log('Current PATH:', process.env.PATH);
    console.log('Current user:', await execAsync('whoami'));
    console.log('Current directory:', process.cwd());
    console.log('Temp directory permissions:', await execAsync(`ls -la ${tmpdir()}`));

    // Try to locate ffmpeg
    const { stdout: ffmpegPath } = await execAsync('which ffmpeg');
    console.log('ffmpeg path:', ffmpegPath.trim());

    // Verify ffmpeg works
    try {
      const { stdout: version } = await execAsync(`${ffmpegPath.trim()} -version`);
      console.log('ffmpeg version:', version);
    } catch (error) {
      console.error('Error checking ffmpeg version:', error);
      throw new Error('ffmpeg version check failed');
    }

    // Run conversion with absolute path
    const { stdout, stderr } = await execAsync(
      `${ffmpegPath.trim()} -i "${inputPath}" -acodec libmp3lame "${outputPath}"`,
      {
        env: {
          ...process.env,
          PATH: '/usr/local/bin:/usr/bin:/bin'
        }
      }
    );

    if (stderr) {
      console.warn('ffmpeg stderr:', stderr);
    }
    if (stdout) {
      console.log('ffmpeg stdout:', stdout);
    }

    // Verify output file exists and has content
    const { stdout: lsOutput } = await execAsync(`ls -l "${outputPath}"`);
    console.log('Output file details:', lsOutput);

    const { readFile } = await import('fs/promises');
    const outputBuffer = await readFile(outputPath);
    
    if (outputBuffer.length === 0) {
      throw new Error('Generated MP3 file is empty');
    }

    console.log('Successfully converted to MP3, size:', outputBuffer.length);

    // Cleanup files
    await Promise.all([
      unlink(inputPath).catch(err => console.error('Error cleaning up input file:', err)),
      unlink(outputPath).catch(err => console.error('Error cleaning up output file:', err))
    ]);

    return outputBuffer;
  } catch (error) {
    console.error('Error in convertToMp3:', error);
    // Cleanup on error
    try {
      await Promise.all([
        unlink(inputPath).catch(() => {}),
        unlink(outputPath).catch(() => {})
      ]);
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    throw error;
  }
}

async function processWavFile(file: File): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempPath = join(tmpdir(), `speaker-${Date.now()}.wav`);
    await writeFile(tempPath, buffer);
    
    // Create a data URL from the WAV file
    const base64 = buffer.toString('base64');
    const dataUrl = `data:audio/wav;base64,${base64}`;
    
    // Clean up temp file
    await unlink(tempPath).catch(() => {});
    
    return dataUrl;
  } catch (error) {
    console.error('Error processing WAV file:', error);
    throw new Error('Failed to process WAV file');
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const model = formData.get('model') as TTSModel;
    const voice = formData.get('voice') as string;
    const language = formData.get('language') as string;
    const speakerWav = formData.get('speaker_wav') as File | null;

    // Validate required fields
    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!model || !['kokoro', 'xtts'].includes(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }

    // Validate model-specific parameters
    if (model === 'kokoro') {
      if (!voice || !KOKORO_VOICES.includes(voice as KokoroVoice)) {
        return NextResponse.json(
          { error: `Invalid voice for Kokoro model. Valid voices are: ${KOKORO_VOICES.join(', ')}` },
          { status: 400 }
        );
      }
    } else if (model === 'xtts') {
      const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh', 'ja'];
      
      if (!language || !validLanguages.includes(language)) {
        return NextResponse.json(
          { error: `Invalid language for XTTS model. Valid languages are: ${validLanguages.join(', ')}` },
          { status: 400 }
        );
      }

      if (voice && !XTTS_SPEAKER_KEYS.includes(voice as XTTS_Speaker) && !speakerWav) {
        return NextResponse.json(
          { error: 'Invalid speaker for XTTS model. Valid speakers are: male, female' },
          { status: 400 }
        );
      }
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    console.log('Processing TTS request:', { model, voice, language, textLength: text.length });

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    let output;

    if (model === 'xtts') {
      console.log('Using XTTS model with language:', language);
      
      // Handle speaker selection
      let speaker: string;
      if (speakerWav) {
        speaker = await processWavFile(speakerWav);
      } else {
        speaker = XTTS_SPEAKERS[voice as XTTS_Speaker] || XTTS_SPEAKERS.female;
      }

      output = await replicate.run(MODELS.xtts, {
        input: {
          text: text.trim(),
          speaker,
          language: language || 'en',
          cleanup_voice: false
        }
      });
    } else {
      console.log('Using Kokoro model with voice:', voice);
      output = await replicate.run(MODELS.kokoro, {
        input: {
          text: text.trim(),
          voice,
          speed: 1.1
        }
      });
    }

    console.log('Model output:', output);

    if (!output) {
      console.error('No output from model');
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }

    const audioResponse = await fetch(output as string);
    if (!audioResponse.ok) {
      console.error('Failed to download audio:', audioResponse.statusText);
      return NextResponse.json(
        { error: `Failed to download audio: ${audioResponse.statusText}` },
        { status: 500 }
      );
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    console.log('Audio buffer size:', audioBuffer.length);

    if (audioBuffer.length === 0) {
      console.error('Empty audio buffer received');
      return NextResponse.json(
        { error: 'Received empty audio data' },
        { status: 500 }
      );
    }

    const mp3Buffer = await convertToMp3(audioBuffer);
    console.log('MP3 buffer size:', mp3Buffer.length);

    if (mp3Buffer.length === 0) {
      console.error('Empty MP3 buffer after conversion');
      return NextResponse.json(
        { error: 'Failed to convert audio to MP3' },
        { status: 500 }
      );
    }

    return new NextResponse(mp3Buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="tts-output.mp3"'
      },
    });

  } catch (error) {
    console.error('TTS API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process TTS request' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not configured' },
      { status: 500 }
    );
  }

  try {
    const { text, voice = 'af_bella' } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    console.log('Processing text:', text);
    console.log('Using voice:', voice);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const prediction = await replicate.predictions.create({
      version: "dfdf537ba482b029e0a761699e6f55e9162cfd159270bfe0e44857caa5f275a6",
      input: {
        text: text.trim(),
        speed: 1.1,
        voice: voice
      }
    });

    console.log('Prediction created:', JSON.stringify(prediction, null, 2));

    let result = await replicate.predictions.get(prediction.id);
    while (result.status === 'processing') {
      console.log('Processing prediction...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
    }

    console.log('Final result:', JSON.stringify(result, null, 2));

    if (result.error) {
      throw new Error(result.error);
    }

    if (!result.output) {
      throw new Error('No output received from Replicate');
    }

    let audioUrl: string;
    if (Array.isArray(result.output) && result.output.length > 0) {
      audioUrl = result.output[0];
    } else if (typeof result.output === 'string') {
      audioUrl = result.output;
    } else {
      console.error('Unexpected output format:', result.output);
      throw new Error('Invalid output format from Replicate');
    }

    if (!audioUrl.startsWith('http')) {
      console.error('Invalid audio URL:', audioUrl);
      throw new Error('Invalid audio URL received from Replicate');
    }

    console.log('Audio URL:', audioUrl);
    return NextResponse.json({ output: audioUrl });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

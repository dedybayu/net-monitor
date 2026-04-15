import { getApiDocs } from '@/src/lib/docs/swagger';
import { NextResponse } from 'next/server';

/**
 * @swagger
 * /api/docs:
 *   get:
 *     tags: [Docs]
 *     summary: Get API documentation
 *     responses:
 *       200:
 *         description: OK
 */

export async function GET() {
    const spec = getApiDocs();
    return NextResponse.json(spec);
}

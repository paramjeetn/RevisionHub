import { supabase } from './supabaseClient'

export interface PDF {
  id: string
  filename: string
  storage_path: string
  date_added: string
  last_revised: string
  revisions: number
  last_score: number | null
  revision_history: RevisionEntry[]
  created_at?: string
}

export interface RevisionEntry {
  date: string
  score: number
}

/**
 * Get all PDFs from database
 */
export async function getAllPDFs(): Promise<PDF[]> {
  const { data, error } = await supabase
    .from('pdfs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching PDFs:', error)
    throw error
  }

  return data || []
}

/**
 * Upload PDF to storage and save metadata
 */
export async function uploadPDF(file: File): Promise<PDF> {
  try {
    // Generate unique storage path
    const timestamp = Date.now()
    const uuid = crypto.randomUUID().slice(0, 8)
    const storagePath = `${timestamp}_${uuid}_${file.name}`

    // Upload to storage
    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .upload(storagePath, file, {
        contentType: 'application/pdf'
      })

    if (storageError) throw storageError

    // Save metadata to database
    const { data, error: dbError } = await supabase
      .from('pdfs')
      .insert({
        filename: file.name,
        storage_path: storagePath,
        date_added: new Date().toISOString(),
        last_revised: new Date().toISOString(),
        revisions: 0,
        last_score: null,
        revision_history: []
      })
      .select()
      .single()

    if (dbError) {
      // Cleanup storage if DB insert fails
      await supabase.storage.from('pdfs').remove([storagePath])
      throw dbError
    }

    return data as PDF
  } catch (error) {
    console.error('Upload error:', error)
    throw error
  }
}

/**
 * Mark PDF as revised with a score
 */
export async function markPDFRevised(pdfId: string, score: number): Promise<PDF> {
  try {
    // Get current PDF data
    const { data: currentPDF, error: fetchError } = await supabase
      .from('pdfs')
      .select('*')
      .eq('id', pdfId)
      .single()

    if (fetchError) throw fetchError

    // Prepare revision history entry
    const revisionEntry: RevisionEntry = {
      date: new Date().toISOString(),
      score
    }

    const updatedHistory = [
      ...(currentPDF.revision_history || []),
      revisionEntry
    ]

    // Update database
    const { data, error: updateError } = await supabase
      .from('pdfs')
      .update({
        last_revised: new Date().toISOString(),
        revisions: (currentPDF.revisions || 0) + 1,
        last_score: score,
        revision_history: updatedHistory
      })
      .eq('id', pdfId)
      .select()
      .single()

    if (updateError) throw updateError

    return data as PDF
  } catch (error) {
    console.error('Mark revised error:', error)
    throw error
  }
}

/**
 * Delete PDF from storage and database
 */
export async function deletePDF(pdfId: string, storagePath: string): Promise<boolean> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('pdfs')
      .remove([storagePath])

    if (storageError) throw storageError

    // Delete from database
    const { error: dbError } = await supabase
      .from('pdfs')
      .delete()
      .eq('id', pdfId)

    if (dbError) throw dbError

    return true
  } catch (error) {
    console.error('Delete error:', error)
    throw error
  }
}

/**
 * Get public URL for a PDF
 */
export function getPDFUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('pdfs')
    .getPublicUrl(storagePath)

  return data.publicUrl
}

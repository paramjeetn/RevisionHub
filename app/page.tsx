"use client"

import { useState, useEffect } from "react"
import {
  Upload,
  FileText,
  Trash2,
  Menu,
  X,
  Sparkles,
  Clock,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { getAllPDFs, uploadPDF, markPDFRevised, getPDFUrl, deletePDF } from "@/lib/database"
import { rankPDFs, getDaysSinceRevision, formatTimeAgo } from "@/lib/priorityCalculator"

export default function App() {
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sortBy, setSortBy] = useState<"priority" | "name" | "revisions" | "date">("priority")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    loadPDFs()
  }, [])

  async function loadPDFs() {
    try {
      setLoading(true)
      const data = await getAllPDFs()
      setPdfs(data)
    } catch (error) {
      alert("Error loading PDFs: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file")
      return
    }

    try {
      setUploading(true)
      await uploadPDF(file)
      await loadPDFs()
      e.target.value = ""
    } catch (error) {
      alert("Upload failed: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRate(pdfId, score) {
    try {
      await markPDFRevised(pdfId, score)
      await loadPDFs()
    } catch (error) {
      alert("Rating failed: " + error.message)
    }
  }

  async function handleDelete(pdfId, storagePath, filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) {
      return
    }

    try {
      await deletePDF(pdfId, storagePath)
      await loadPDFs()
    } catch (error) {
      alert("Delete failed: " + error.message)
    }
  }

  const rankedPDFs = rankPDFs(pdfs)

  const sortedPDFs = [...rankedPDFs].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case "priority":
        comparison = a.priority - b.priority
        break
      case "name":
        comparison = a.filename.localeCompare(b.filename)
        break
      case "revisions":
        comparison = (a.revisions || 0) - (b.revisions || 0)
        break
      case "date":
        comparison = getDaysSinceRevision(a) - getDaysSinceRevision(b)
        break
    }

    return sortOrder === "asc" ? comparison : -comparison
  })

  const getPriorityBadge = (priority) => {
    if (priority > 10)
      return { label: "High Priority", color: "bg-destructive/10 text-destructive border-destructive/20", icon: "🔴" }
    if (priority > 5)
      return { label: "Medium Priority", color: "bg-warning/10 text-warning border-warning/20", icon: "🟡" }
    return { label: "Low Priority", color: "bg-success/10 text-success border-success/20", icon: "🟢" }
  }

  const stats = {
    total: pdfs.length,
    high: rankedPDFs.filter((p) => p.priority > 10).length,
    medium: rankedPDFs.filter((p) => p.priority > 5 && p.priority <= 10).length,
    low: rankedPDFs.filter((p) => p.priority <= 5).length,
  }

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("desc")
    }
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 opacity-30" />
    return sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-80" : "w-0"} bg-card border-r border-border transition-all duration-300 overflow-hidden relative`}
      >
        <div className="w-80 h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">RevisionHub</h2>
                  <p className="text-xs text-muted-foreground">Smart Learning</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3 border border-border">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total PDFs</div>
              </div>
              <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20">
                <div className="text-2xl font-bold text-destructive">{stats.high}</div>
                <div className="text-xs text-muted-foreground">High Priority</div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Upload Material</h3>
              </div>

              <label className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-300">
                <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={uploading} className="hidden" />
                <div className="text-center">
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-3"></div>
                      <p className="text-sm font-medium text-foreground">Uploading...</p>
                      <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">Drop your PDF here</p>
                      <p className="text-xs text-muted-foreground">or click to browse</p>
                      <div className="mt-3 px-3 py-1 bg-secondary rounded-full text-xs text-muted-foreground">
                        PDF files only
                      </div>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2 text-balance">Your Revision Dashboard</h1>
                <p className="text-muted-foreground">Track your progress and prioritize your study materials</p>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4"></div>
              <p className="text-muted-foreground">Loading your materials...</p>
            </div>
          ) : pdfs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-card rounded-2xl border border-border">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-float">
                <FileText className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">No materials yet</h3>
              <p className="text-muted-foreground mb-6">Upload your first PDF to get started</p>
              <button
                onClick={() => setSidebarOpen(true)}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all shadow-lg hover:shadow-xl"
              >
                Upload PDF
              </button>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">#</th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("name")}
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                          File Name
                          <SortIcon column="name" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("priority")}
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                          Priority
                          <SortIcon column="priority" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("revisions")}
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                          Revisions
                          <SortIcon column="revisions" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                        <button
                          onClick={() => toggleSort("date")}
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                          Last Revised
                          <SortIcon column="date" />
                        </button>
                      </th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Rate Revision</th>
                      <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPDFs.map((pdf, idx) => {
                      const badge = getPriorityBadge(pdf.priority)
                      return (
                        <tr
                          key={pdf.id}
                          className="border-b border-border hover:bg-secondary/20 transition-colors group"
                        >
                          <td className="p-4 text-sm font-medium text-muted-foreground">{idx + 1}</td>
                          <td className="p-4">
                            <a
                              href={getPDFUrl(pdf.storage_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 group/link cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover/link:bg-primary/20 transition-colors">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="min-w-0 max-w-xs">
                                <div
                                  className="font-semibold text-foreground truncate group-hover/link:text-primary transition-colors"
                                  title={pdf.filename}
                                >
                                  {pdf.filename}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatTimeAgo(getDaysSinceRevision(pdf))}
                                </div>
                              </div>
                            </a>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${badge.color} whitespace-nowrap`}
                              >
                                {badge.icon} {pdf.priority.toFixed(1)}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-accent" />
                              <span className="font-semibold text-foreground">{pdf.revisions || 0}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{getDaysSinceRevision(pdf)} days ago</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              {[
                                { score: 1, emoji: "😢", label: "Hard" },
                                { score: 2, emoji: "😐", label: "Okay" },
                                { score: 3, emoji: "😊", label: "Easy" },
                              ].map(({ score, emoji, label }) => (
                                <button
                                  key={score}
                                  onClick={() => handleRate(pdf.id, score)}
                                  className="p-2 bg-secondary hover:bg-primary/10 rounded-lg transition-all hover:scale-110 active:scale-95"
                                  title={label}
                                >
                                  <span className="text-xl">{emoji}</span>
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDelete(pdf.id, pdf.storage_path, pdf.filename)}
                                className="p-2 bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground text-destructive rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer */}
          {pdfs.length > 0 && (
            <footer className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-card rounded-full border border-border text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                Powered by smart priority algorithms
              </div>
            </footer>
          )}
        </div>
      </main>
    </div>
  )
}

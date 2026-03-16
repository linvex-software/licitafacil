'use client'
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

export interface PregaoMonitorado {
  id?: string
  numeroPregao: string
  objeto: string
  orgao: string
  portal: 'PNCP' | 'COMPRASNET' | 'LICITAR_DIGITAL' | 'BNC'
  status: 'AGUARDANDO' | 'EM_DISPUTA' | 'ENCERRADO' | 'CANCELADO'
  horarioInicio: string
  urlSalaDisputa: string
  urlFallbackPncp?: string
  melhorLance?: number
}

interface UseMonitoramentoSocketReturn {
  conectado: boolean
  reconectando: boolean
  updates: PregaoMonitorado[]
  alertas: PregaoMonitorado[]
}

export function useMonitoramentoSocket(empresaId?: string): UseMonitoramentoSocketReturn {
  const [conectado, setConectado] = useState(false)
  const [reconectando, setReconectando] = useState(false)
  const [updates, setUpdates] = useState<PregaoMonitorado[]>([])
  const [alertas, setAlertas] = useState<PregaoMonitorado[]>([])
  const socketRef = useRef<Socket | null>(null)

  function tocarAlerta() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.start()
      osc.stop(ctx.currentTime + 0.8)
    } catch (_) {
      // AudioContext pode não estar disponível em SSR ou por política do navegador
    }
  }

  useEffect(() => {
    if (!empresaId) return

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    const socket = io(`${apiUrl}/monitoramento`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConectado(true)
      setReconectando(false)
      socket.emit('monitoramento:join', { empresaId })
    })

    socket.on('disconnect', () => setConectado(false))
    socket.io.on('reconnect_attempt', () => setReconectando(true))
    socket.io.on('reconnect', () => setReconectando(false))

    socket.on('monitoramento:update', (pregao: PregaoMonitorado) => {
      setUpdates(prev => {
        const idx = prev.findIndex(p => p.numeroPregao === pregao.numeroPregao)
        if (idx >= 0) {
          const nova = [...prev]
          nova[idx] = pregao
          return nova
        }
        return [...prev, pregao]
      })
    })

    socket.on('monitoramento:alerta', (pregao: PregaoMonitorado) => {
      tocarAlerta()
      setAlertas(prev => [pregao, ...prev].slice(0, 5))
    })

    return () => { socket.disconnect() }
  }, [empresaId])

  return { conectado, reconectando, updates, alertas }
}

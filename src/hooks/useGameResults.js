import { useState } from 'react'
import supabase from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useGameResults = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const saveGameResult = async (phoneNumberId, gameMode, starsEarned, scoreDetails) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: saveError } = await supabase
        .from('game_results')
        .insert([{
          user_id: user.id,
          phone_number_id: phoneNumberId,
          game_mode: gameMode,
          stars_earned: starsEarned,
          score_details: scoreDetails
        }])
        .select()
        .single()

      if (saveError) throw saveError
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const getGameHistory = async (phoneNumberId) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('game_results')
        .select('*')
        .eq('phone_number_id', phoneNumberId)
        .order('played_at', { ascending: false })
        .limit(10)

      if (fetchError) throw fetchError
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return {
    saveGameResult,
    getGameHistory,
    loading,
    error
  }
}
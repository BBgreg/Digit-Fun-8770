import { useState, useEffect } from 'react'
import supabase from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useGameProgress = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gameResults, setGameResults] = useState([])
  const { user } = useAuth()

  const fetchGameResults = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!user) {
        setGameResults([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from('game_results')
        .select('*')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })

      if (fetchError) throw fetchError
      setGameResults(data || [])
    } catch (err) {
      console.error('Error fetching game results:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveGameResult = async (phoneNumberId, gameMode, starsEarned, scoreDetails = {}) => {
    try {
      setError(null)
      if (!user) throw new Error('You must be logged in to save game results')

      // Save game result
      const { data, error: insertError } = await supabase
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

      if (insertError) throw insertError

      // Update last_practiced_at and potentially mastery_level
      // First get current phone number data
      const { data: phoneData, error: phoneError } = await supabase
        .from('user_phone_numbers')
        .select('mastery_level')
        .eq('id', phoneNumberId)
        .single()

      if (phoneError) throw phoneError

      // Calculate new mastery level - it increases with high star counts
      // and decreases slightly with low star counts
      let newMasteryLevel = phoneData.mastery_level || 0
      if (starsEarned >= 4) {
        // Good performance increases mastery significantly
        newMasteryLevel += Math.min(2, 5 - newMasteryLevel)
      } else if (starsEarned >= 2) {
        // Moderate performance increases mastery slightly
        newMasteryLevel += Math.min(1, 5 - newMasteryLevel)
      } else if (starsEarned === 0) {
        // Poor performance decreases mastery
        newMasteryLevel = Math.max(0, newMasteryLevel - 1)
      }

      // Cap mastery level between 0-5
      newMasteryLevel = Math.min(5, Math.max(0, newMasteryLevel))

      // Update the phone number record
      const { error: updateError } = await supabase
        .from('user_phone_numbers')
        .update({
          last_practiced_at: new Date().toISOString(),
          mastery_level: newMasteryLevel
        })
        .eq('id', phoneNumberId)

      if (updateError) throw updateError

      await fetchGameResults()
      return { success: true, data }
    } catch (err) {
      console.error('Error saving game result:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchGameResults()
  }, [user])

  return {
    gameResults,
    loading,
    error,
    saveGameResult,
    refetch: fetchGameResults
  }
}
import axios from 'axios'

const INSTAGRAM_GRAPH_API = 'https://graph.instagram.com'
const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0'

export interface InstagramAccount {
  id: string
  username: string
  name: string
  profile_picture_url?: string
}

export interface PostMediaResponse {
  id: string
  permalink: string
}

export interface MediaInsights {
  likes: number
  comments: number
  shares: number
  saves: number
  reach: number
  impressions: number
  engagement: number
}

/**
 * Get Instagram Business Account ID from Facebook Page
 */
export async function getInstagramBusinessAccount(
  pageAccessToken: string,
  facebookPageId: string
): Promise<InstagramAccount> {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API}/${facebookPageId}`,
      {
        params: {
          fields: 'instagram_business_account{id,username,name,profile_picture_url}',
          access_token: pageAccessToken,
        },
      }
    )

    return response.data.instagram_business_account
  } catch (error) {
    console.error('Error getting Instagram business account:', error)
    throw new Error('Failed to get Instagram business account')
  }
}

/**
 * Create a media container for Instagram Reel
 */
export async function createReelMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
  coverUrl?: string
): Promise<string> {
  try {
    const params: any = {
      media_type: 'REELS',
      video_url: videoUrl,
      caption: caption,
      share_to_feed: true,
      access_token: accessToken,
    }

    if (coverUrl) {
      params.thumb_offset = 0 // Use first frame or specify offset
    }

    const response = await axios.post(
      `${FACEBOOK_GRAPH_API}/${instagramAccountId}/media`,
      null,
      { params }
    )

    return response.data.id // Container ID
  } catch (error: any) {
    console.error('Error creating media container:', error.response?.data || error)
    throw new Error('Failed to create media container')
  }
}

/**
 * Check media container status
 */
export async function checkMediaContainerStatus(
  containerId: string,
  accessToken: string
): Promise<{ status: string; status_code?: string }> {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API}/${containerId}`,
      {
        params: {
          fields: 'status_code,status',
          access_token: accessToken,
        },
      }
    )

    return response.data
  } catch (error) {
    console.error('Error checking container status:', error)
    throw new Error('Failed to check container status')
  }
}

/**
 * Publish media container to Instagram
 */
export async function publishMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  containerId: string
): Promise<PostMediaResponse> {
  try {
    const response = await axios.post(
      `${FACEBOOK_GRAPH_API}/${instagramAccountId}/media_publish`,
      null,
      {
        params: {
          creation_id: containerId,
          access_token: accessToken,
        },
      }
    )

    // Get permalink
    const mediaId = response.data.id
    const mediaResponse = await axios.get(
      `${FACEBOOK_GRAPH_API}/${mediaId}`,
      {
        params: {
          fields: 'permalink',
          access_token: accessToken,
        },
      }
    )

    return {
      id: mediaId,
      permalink: mediaResponse.data.permalink,
    }
  } catch (error: any) {
    console.error('Error publishing media:', error.response?.data || error)
    throw new Error('Failed to publish media')
  }
}

/**
 * Complete flow: Upload and publish Reel to Instagram
 */
export async function postReelToInstagram(
  instagramAccountId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
  coverUrl?: string
): Promise<PostMediaResponse> {
  try {
    // Step 1: Create media container
    console.log('Creating media container...')
    const containerId = await createReelMediaContainer(
      instagramAccountId,
      accessToken,
      videoUrl,
      caption,
      coverUrl
    )

    // Step 2: Wait for video to be processed (poll status)
    console.log('Waiting for video processing...')
    let attempts = 0
    const maxAttempts = 30 // 5 minutes max
    
    while (attempts < maxAttempts) {
      const status = await checkMediaContainerStatus(containerId, accessToken)
      
      if (status.status_code === 'FINISHED') {
        break
      } else if (status.status_code === 'ERROR') {
        throw new Error('Video processing failed')
      }
      
      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000))
      attempts++
    }

    if (attempts >= maxAttempts) {
      throw new Error('Video processing timeout')
    }

    // Step 3: Publish the media
    console.log('Publishing to Instagram...')
    const result = await publishMediaContainer(
      instagramAccountId,
      accessToken,
      containerId
    )

    return result
  } catch (error) {
    console.error('Error posting reel to Instagram:', error)
    throw error
  }
}

/**
 * Get media insights/analytics
 */
export async function getMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<MediaInsights> {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API}/${mediaId}/insights`,
      {
        params: {
          metric: 'likes,comments,shares,saves,reach,impressions,engagement',
          access_token: accessToken,
        },
      }
    )

    const insights: any = {}
    response.data.data.forEach((metric: any) => {
      insights[metric.name] = metric.values[0].value
    })

    return {
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      shares: insights.shares || 0,
      saves: insights.saves || 0,
      reach: insights.reach || 0,
      impressions: insights.impressions || 0,
      engagement: insights.engagement || 0,
    }
  } catch (error) {
    console.error('Error getting media insights:', error)
    throw new Error('Failed to get media insights')
  }
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const response = await axios.get(
      `${FACEBOOK_GRAPH_API}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      }
    )

    return response.data
  } catch (error) {
    console.error('Error exchanging token:', error)
    throw new Error('Failed to exchange token')
  }
}

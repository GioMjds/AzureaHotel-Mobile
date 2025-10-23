import os
import json
import logging
import requests
from requests.auth import HTTPBasicAuth

logger = logging.getLogger(__name__)

PAYMONGO_API_BASE = 'https://api.paymongo.com/v1'
PAYMONGO_SECRET = os.environ.get('PAYMONGO_TEST_SECRET_KEY')


def _auth():
	if not PAYMONGO_SECRET:
		raise RuntimeError('PAYMONGO_TEST_SECRET_KEY is not configured')
	return HTTPBasicAuth(PAYMONGO_SECRET, '')



def create_source(amount: int = None, currency: str = 'PHP', source_type: str = 'gcash', metadata: dict = None, redirect_success: str = None, redirect_failed: str = None):
	"""
	Create a PayMongo source. `amount` if provided is expected in centavos (PHP * 100).
	If `amount` is None the amount attribute will be omitted (useful when allowing customer-entered amount at checkout).
	Returns the JSON response from PayMongo or raises RuntimeError with details on failure.
	"""
	url = f"{PAYMONGO_API_BASE}/sources"
	attributes = {
		'currency': currency,
		'type': source_type,
	}

	# Only include amount when explicitly provided
	if amount is not None:
		attributes['amount'] = int(amount)

	# Only include redirect object when both success and failed URLs are provided and non-empty.
	# Sending empty strings causes PayMongo to respond with parameter_required errors.
	if redirect_success and redirect_failed:
		attributes['redirect'] = {
			'success': redirect_success,
			'failed': redirect_failed
		}

	if metadata:
		attributes['metadata'] = metadata

	payload = {'data': {'attributes': attributes}}

	resp = None
	try:
		logger.debug('PayMongo create_source payload: %s', json.dumps(payload))
		resp = requests.post(url, json=payload, auth=_auth(), timeout=10)
		# Log response body for debug (even before raise)
		logger.debug('PayMongo create_source raw response status=%s body=%s', getattr(resp, 'status_code', None), getattr(resp, 'text', None))
		resp.raise_for_status()
		return resp.json()
	except requests.exceptions.RequestException as e:
		# If we have a response object, include its body for easier debugging
		if resp is not None:
			try:
				logger.error('PayMongo create_source failed: status=%s body=%s', resp.status_code, resp.text)
			except Exception:
				logger.exception('Failed to log PayMongo response body')
			# Raise a RuntimeError with the response text to propagate a clearer message
			raise RuntimeError(f"PayMongo create failed: status={resp.status_code} body={resp.text}")
		# Fallback for other request exceptions
		raise


def retrieve_source(source_id: str):
	url = f"{PAYMONGO_API_BASE}/sources/{source_id}"
	try:
		resp = requests.get(url, auth=_auth(), timeout=10)
		resp.raise_for_status()
		return resp.json()
	except Exception as e:
		logger.exception('Failed to retrieve PayMongo source %s', source_id)
		raise


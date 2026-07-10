<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { CameraOutline, LockClosedOutline, PersonCircleOutline } from '@vicons/ionicons5'
import { useAuthStore } from '../../stores/authStore'
import type { UserLoginRequest } from '../../types/user'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive<UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

const rules: FormRules = {
  userAccount: [
    { required: true, message: '请输入账号', trigger: ['blur', 'input'] },
    { min: 4, max: 16, message: '账号长度应为 4-16 位', trigger: ['blur', 'input'] },
  ],
  userPassword: [
    { required: true, message: '请输入密码', trigger: ['blur', 'input'] },
    { min: 8, max: 32, message: '密码长度应为 8-32 位', trigger: ['blur', 'input'] },
  ],
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '登录失败，请稍后重试'
}

async function handleLogin() {
  await formRef.value?.validate()

  loading.value = true
  try {
    await auth.login({ ...formData })
    message.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect)
  } catch (error) {
    message.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="auth-panel">
      <div class="auth-brand">
        <span class="auth-mark">
          <n-icon :component="CameraOutline" />
        </span>
        <div>
          <h1>PictureHub</h1>
          <p>登录后进入你的图片空间</p>
        </div>
      </div>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="top"
        size="large"
        @keyup.enter="handleLogin"
      >
        <n-form-item label="账号" path="userAccount">
          <n-input
            v-model:value="formData.userAccount"
            placeholder="请输入账号"
            :input-props="{ autocomplete: 'username' }"
          >
            <template #prefix>
              <n-icon :component="PersonCircleOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="密码" path="userPassword">
          <n-input
            v-model:value="formData.userPassword"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            :input-props="{ autocomplete: 'current-password' }"
          >
            <template #prefix>
              <n-icon :component="LockClosedOutline" />
            </template>
          </n-input>
        </n-form-item>

        <n-button type="primary" block size="large" :loading="loading" @click="handleLogin">
          登录
        </n-button>
      </n-form>

      <p class="auth-switch">
        还没有账号？
        <n-button text type="primary" @click="router.push('/register')">立即注册</n-button>
      </p>
      <p class="back-link">
        <n-button text @click="router.push('/')">返回公共图库</n-button>
      </p>
    </section>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 16px;
}

.auth-panel {
  width: min(420px, 100%);
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}

.auth-mark {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 26px;
}

h1,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 26px;
  line-height: 1.2;
}

.auth-brand p {
  margin-top: 6px;
  color: #6b7280;
  font-size: 14px;
}

.auth-switch,
.back-link {
  margin-top: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #6b7280;
  font-size: 14px;
}

.back-link {
  margin-top: 8px;
}

@media (max-width: 420px) {
  .auth-panel {
    padding: 24px;
  }
}
</style>
